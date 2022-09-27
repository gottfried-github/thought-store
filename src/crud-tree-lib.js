/**
    @param tree a tree of nodes, processed by `describeToSave`
*/
function saveDeepestAsync(tree, map, save) {

  function doSave(node, depths) {
    const deepest = Math.max(...depths)
    if (deepest == -1) {
      return Promise.resolve(node)
    }

    const deepestIndex = depths.indexOf(deepest)

    const refDeepest = node.refs[deepestIndex]

    var child = map.ids[refDeepest.to]

    // this only saves the terminal node of the deepest path
    return doSaveOne(child, map)
    .then((deepestSaved) => {
      depths[deepestIndex]--

      return doSave(node, depths, map)
    })
  }

  function doSaveOne(node) {
    if (node.visited) return Promise.resolve(node)


    if (!node.refs || node.refs.length == 0) {
      node.visited = true
      return save(node, map)
    }

    // map children's lengths to an array, except those children that are already saved
    var depths = []
    var unsavedIndexes = []
    var i = 0; const len = node.refs.length;
    for (i; i < len; i++) {

      // we handle the terminal refs in the save cb, so here I just skip those (I dont want to follow these in traversal)
      if (node.refs[i].toTerminal) continue
      if (map.ids[node.refs[i].to].visited) continue

      depths.push(map.ids[node.refs[i].to].depth)
      unsavedIndexes.push(i)
    }

    // the node can be saved only and only if all it's descendants
    // are saved (all it's children and all their children and so on)
    if (depths.length == 0) {
      node.depth--

      node.visited = true
      return save(node, map)
    }

    const deepest = Math.max(...depths)
    var deepestIndex = depths.indexOf(deepest)

    // we didnt push terminal refs to unsavedIndexes, so we dont have to check for them here
    var nextNode = map.ids[node.refs[unsavedIndexes[deepestIndex]].to]

    return doSaveOne(nextNode)
    .then((nodeSaved) => {

      // The node may contain more than one child with the same depth.
      // If the depth we're looking for is the max depth for this node,
      // then we want to save the terminal node of each of the children
      // with such depth.

      // indexOf returns the index of the first occurence of given value.
      // if theres more than one occurence, to find it we have to remove the part of
      // the array, that we already examined, and then run the indeOf again,
      // on the remainder
      depths = depths.slice(deepestIndex+1)
      unsavedIndexes = unsavedIndexes.slice(deepestIndex+1)

      if (depths.length == 0) {
        node.depth--
        node.visited = true
        return save(node, map)
      }

      const nodesToSave = []
      while ((deepestIndex = depths.indexOf(deepest)) > -1) {
        var nodeToSave = map.ids[node.refs[unsavedIndexes[deepestIndex]]]

        nodeToSave.index = unsavedIndexes[deepestIndex]
        nodesToSave.push(nodeToSave)

        depths = depths.slice(deepestIndex+1)
        unsavedIndexes = unsavedIndexes.slice(deepestIndex+1)

      }

      return saveArray(nodesToSave, [])
      .then((nodesSaved) => {
        nodesSaved.forEach((nodeSaved) => {
          nodeSaved.visited = true
        })

        node.depth--
        return node
      })

    })

    function saveArray(nodes, saved) {

      if (nodes.length == 0) {
        return Promise.resolve(saved)
      }

      return doSaveOne(nodes.shift())
      .then((nodeSaved) => {
        saved.unshift(nodeSaved)

        return saveArray(nodes, saved)
      })
    }

  }

  tree = map.ids[tree._id]

  var depths = []

  tree.refs.forEach((ref) => {
    // we dont want to follow toTerminal refs in traversal
    // (we handle those refs in the save cb)
    if (ref.toTerminal) {
      depths.push(-1)
      return
    }

    depths.push(map.ids[ref.to].depth)
  })

  return doSave(tree, depths)
  .then(() => {
    return save(tree, map)
    .then((saved) => {
      return {tree: saved, map: map}
    })
  })
}

function detectCycles(node, map, pathIds) {
  if (node.decycled) {
    console.log('decycleTree, node is already decycled, node:', node);
    return node
  }

  if (pathIds.indexOf(node._id) > -1) {
    throw new Error("tree contains cycles")
  }

  if (node.refs && node.refs.length > 0) {
    node.refs.forEach((ref) => {
      if (!ref.to && !ref.toTerminal) {throw new Error("invalid ref format: ref must have eiter to or toTerminal")}
      if (!ref.to) return

      detectCycles(
        map.ids[ref.to],
        map,
        pathIds.concat(node._id)
      )

    })
  }

  node.decycled = true
  pathIds.pop()
  return map.ids[node._id]
}

function describeToSave(node, map) {
  function doDescribeToSave(node, level) {
    if (node.type == 'resource') {
      node.level = level
      node.depth = 0

      node.described = true
      return node
    }

    if (node.type != 'entity') throw new Error('invalid node type: '+node.type)
    if (!node.refs || node.refs.length == 0) throw new Error('an entity must have at least one ref')

    var maxDepth = 0
    var i = 0; const len = node.refs.length;
    for (i; i < len; i++) {

      var referee = map.ids[node.refs[i].to]
      if (!referee.described) {
        referee = doDescribeToSave(
          referee,
          level+1,
          map
        )
      }

      map.ids[referee._id] = referee

      if (referee.depth > maxDepth) {
        maxDepth = referee.depth
      }
    }

    node.level = level
    node.depth = maxDepth +1
    node.described = true

    return node
  }

  map.ids[node._id] = doDescribeToSave(node, -1)
  return {tree: map.ids[node._id], map: map}
}

module.exports = {
  saveDeepestAsync,
  describeToSave
}
