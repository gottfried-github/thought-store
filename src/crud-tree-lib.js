
function traverseAsync(node, save) {

  function doTraverseChildrenAsync(childrenToSave, childrenSaved) {
    return doTraverseAsync(childrenToSave.shift())
    .then((savedChild) => {
      childrenSaved.unshift(savedChild)

      if (childrenToSave.length == 0) {
        return childrenSaved
      }

      return doTraverseChildrenAsync(childrenToSave, childrenSaved)
    })
  }

  function doTraverseAsync(node) {
    if (!node.children || node.children.length == 0) {
      return save(node)
    }

    return doTraverseChildrenAsync([].concat(node.children), [])
    .then((savedChildren) => {
      node.children = savedChildren
      return save(node)
    })
  }

  return doTraverseAsync(node)
}

/*
function traverseAsync(node, save) {

  function doTraverseChildrenAsync(childrenToSave, childrenSaved) {
    return doTraverseAsync(childrenToSave.shift())
    .then((savedChild) => {
      childrenSaved.unshift(savedChild)

      if (childrenToSave.length == 0) {
        return childrenSaved
      }

      return doTraverseChildrenAsync(childrenToSave, childrenSaved)
    })
  }

  function doTraverseAsync(node) {
    if (!node.children || node.children.length == 0) {
      return save(node)
    }

    return doTraverseChildrenAsync([].concat(node.children), [])
    .then((savedChildren) => {
      node.children = savedChildren
      return save(node)
    })
  }

  return doTraverseAsync(node)
}
*/

class Node {
  constructor() {

  }
}


function buildTree(tree, maps) {

}

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

function saveDeepestAsyncLegacyOne(tree, map, save) {

  function doSave(node, depths) {
    const deepest = Math.max(...depths)
    if (deepest == -1) {
      return Promise.resolve(node)
    }

    const deepestIndex = depths.indexOf(deepest)

    // console.log('doSave, depths', depths)

    const refDeepest = node.refs[deepestIndex]
    // if (!refDeepest.to) {
    //   return Promise.reject(new Error('invalid ref format: must have either to or toTerminal'))
    // }

    var child = map.ids[refDeepest.to]

    // if (child.type != 'label') child = maps.ids[child.id]

    // this only saves the terminal node of the deepest path
    return doSaveOne(child, map)
    .then((deepestSaved) => {
      // console.log('doSave, didSaveOne.then');
      // map.ids[deepestSaved.id] = deepestSaved
      // node.children[deepestIndex] = deepestSaved

      // maps.ids[deepestSaved.id] = deepestSaved
      depths[deepestIndex]--

      // console.log('doSaveDeepest, didSaveDeepestOne, node', JSON.parse(JSON.stringify(deepestSaved)));
      return doSave(node, depths, map)//.then((res) => {return resolve(res)})
    })
  }


  function doSaveOne(node) {
    if (node.visited) return Promise.resolve(node)

    // if (node.terminal) {
    //   node.visited = true
    //
    // }

    if (!node.refs || node.refs.length == 0) {
      node.visited = true
      return save(node)
    }

    // map children's lengths to an array, except those children that are already saved
    var depths = []
    var unsavedIndexes = []
    var i = 0; const len = node.refs.length;
    for (i; i < len; i++) {
      // if (!node.refs[i].to && !node.refs[i].toTerminal) throw new Error('invalid ref format')

      // we don't push terminal nodes to the unsavedIndexes, so they won't be
      // recursed at all
      // if (node.refs[i].toTerminal) {
      //   terminals.push(map.ids[node.refs[i].toTerminal])
      //   continue
      // }

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
      // console.log('doSaveOne, descendants saved, saving')
      return save(node, map)
      // this piece is to be executed in the save callback
      // .then((nodeSaved) => {
      //
      //   maps.ids[nodeSaved.id] = nodeSaved
      //   console.log('doSaveOne, saved node, node in maps:', maps.ids[nodeSaved.id])
      //
      //   return nodeSaved
      // })
      // console.log('doSaveDeepestOne, descendants saved, saving.', JSON.parse(JSON.stringify(node)));
      // return node
    }

    const deepest = Math.max(...depths)
    var deepestIndex = depths.indexOf(deepest)

    // we didnt push terminal refs to unsavedIndexes, so we dont have to check for them here
    var nextNode = map.ids[node.refs[unsavedIndexes[deepestIndex]].to]

    // console.log('doSaveOne, nextNode:', nextNode)

    // this only saves the terminal node of the deepest path
    return doSaveOne(nextNode)
    .then((nodeSaved) => {
      // this oneliner should be executed in the save cb:
      // maps.ids[nodeSaved.id] = nodeSaved
      // console.log('doSaveOne, saved node, node in maps:', map.ids[nodeSaved._id])

      // this perhaps too should be executed elsewhere
      // node.children[unsavedIndexes[deepestIndex]] = nodeSaved

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

      // deepestIndex = null
      if (depths.length == 0) {
        node.depth--
        node.visited = true
        // console.log('doSaveOne, saved the descendants, so saving the node')
        return save(node, map)
        // this is to be executed in the save cb
        // .then((nodeSaved) => {
        //   console.log('didSaveNode, nodeSaved', nodeSaved)
        //   maps.ids[nodeSaved.id] = nodeSaved
        //   console.log('doSaveOne, saved node, node in maps:', maps.ids[nodeSaved.id])
        //
        //   return nodeSaved
        // })
      }

      const nodesToSave = []
      while ((deepestIndex = depths.indexOf(deepest)) > -1) {
        var nodeToSave = map.ids[node.refs[unsavedIndexes[deepestIndex]]]

        // if (nodeToSave.type != 'label') nodeToSave = maps.ids[nodeToSave.id]
        nodeToSave.index = unsavedIndexes[deepestIndex]
        nodesToSave.push(nodeToSave)

        // console.log('doSaveDeepestOne, while loop, deepestIndex:', deepestIndex);
        depths = depths.slice(deepestIndex+1)
        unsavedIndexes = unsavedIndexes.slice(deepestIndex+1)

        // console.log('doSaveDeepestOne, while loop, deepestIndex:', deepestIndex);
        // node.children[(unsavedIndexes[deepestIndex])] = doSaveDeepestOne(node.children[(unsavedIndexes[deepestIndex])], maps)
        // depths = depths.slice(deepestIndex+1)
        // unsavedIndexes = unsavedIndexes.slice(deepestIndex+1)
      }

      return saveArray(nodesToSave, [])
      .then((nodesSaved) => {
        // console.log('savedArray, resolving');
        nodesSaved.forEach((nodeSaved) => {
          nodeSaved.visited = true
          // maps.ids[nodeSaved.id] = nodeSaved
          // console.log('doSaveOne, saved node, node in maps:', maps.ids[nodeSaved.id])
          //
          // node.children[nodeSaved.index] = nodeSaved
        })

        node.depth--
        // return save(node, maps).then((res) => {return resolve(res)})
        return node
      })

    })

    function saveArray(nodes, saved) {

      if (nodes.length == 0) {
        // console.log('saveArray, nodes is empty, resolving');
        return Promise.resolve(saved)
      }

      return doSaveOne(nodes.shift())
      .then((nodeSaved) => {
        // console.log('saveArray, didSaveOne.then')
        saved.unshift(nodeSaved)

        // console.log('saveArray, saved node, nodes, saved:', nodes, saved);
        return saveArray(nodes, saved)
      })
    }

  }

  tree = maps.ids[tree._id]

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
    return save(tree)
  })
}

function saveDeepestAsyncLegacy(tree, maps, save) {
  function doSave(node, depths) {

    const deepest = Math.max(...depths)
    if (deepest == -1) {
      return Promise.resolve(node)
    }

    const deepestIndex = depths.indexOf(deepest)

    console.log('doSave, depths', depths)

    var child = node.children[deepestIndex]
    if (child.type != 'label') child = maps.ids[child.id]
    // this only saves the terminal node of the deepest path
    return doSaveOne(child, maps)
    .then((deepestSaved) => {
      console.log('doSave, didSaveOne.then');
      node.children[deepestIndex] = deepestSaved

      maps.ids[deepestSaved.id] = deepestSaved
      depths[deepestIndex]--

      // console.log('doSaveDeepest, didSaveDeepestOne, node', JSON.parse(JSON.stringify(deepestSaved)));
      return doSave(node, depths, maps)//.then((res) => {return resolve(res)})
    })
  }

  function doSaveOne(node) {

      console.log('doSaveOne, NODE', node);
      if (node.visited) return Promise.resolve(node)

      // console.log('doSaveDeepestOne', node);

      if (node.type == 'label') {
        console.log('node is a label, god is a DJ', node)
        console.log('node is a label, god is a DJ', maps.ids[node.to])
        if (node.terminal) {
          node.visited = true


          // the referenced node is by definition an ancestor of the current node,
          // so we save it for later, because this method traverses in the direction
          // from descendants to ancestors, so to set the id of the referenced node
          // as referee in this node, we need to first save that node.
          maps.terminals.push(node)
          return Promise.resolve(node)
        }

        if (maps.ids[node.to].visited) {
          console.log('node is a label, the referee is already visited');
          return Promise.resolve(node)
        }

        return doSaveOne(maps.ids[node.to]).then((nodeSaved) => {
          maps.ids[node.to] = nodeSaved
          console.log('doSaveOne, saved node, node in maps:', maps.ids[node.to])
          return nodeSaved
        })
      }

      // if (!node.children || node.children.length == 0) {
      if (!node.children || node.children.length == 0) {
        // console.log('doSaveDeepestOne, terminal node, saved', JSON.parse(JSON.stringify(node)));

        console.log('doSaveOne, node has no children, saving')
        node.visited = true
        return save(node, maps).then((nodeSaved) => {
          console.log('doSaveOne, didSave node, the node: ', nodeSaved)
          maps.ids[nodeSaved.id] = nodeSaved
          console.log('doSaveOne, saved node, node in maps:', maps.ids[nodeSaved.id])
          return nodeSaved
        })
      }

      // map children's lengths to an array, except those children that are already saved
      var depths = []
      var unsavedIndexes = []
      var i = 0; const len = node.children.length;
      for (i; i < len; i++) {
        if (node.children[i].visited) continue
        depths.push(node.children[i].depth)
        unsavedIndexes.push(i)
      }

      // the node can be saved only and only if all it's descendants
      // are saved (all it's children and all their children and so on)
      if (depths.length == 0) {
        node.depth--

        node.visited = true
        console.log('doSaveOne, descendants saved, saving')
        return save(node, maps).then((nodeSaved) => {

          maps.ids[nodeSaved.id] = nodeSaved
          console.log('doSaveOne, saved node, node in maps:', maps.ids[nodeSaved.id])

          return nodeSaved
        })
        // console.log('doSaveDeepestOne, descendants saved, saving.', JSON.parse(JSON.stringify(node)));
        // return node
      }

      const deepest = Math.max(...depths)
      var deepestIndex = depths.indexOf(deepest)

      var nextNode = node.children[unsavedIndexes[deepestIndex]]
      if (nextNode.type != 'label') nextNode = maps.ids[nextNode.id]
      console.log('doSaveOne, nextNode:', nextNode)
      // console.log('doSaveOne, nextNode again:', nextNode)

      // this only saves the terminal node of the deepest path
      return doSaveOne(nextNode)
      .then((nodeSaved) => {
        maps.ids[nodeSaved.id] = nodeSaved
        console.log('doSaveOne, saved node, node in maps:', maps.ids[nodeSaved.id])

        node.children[unsavedIndexes[deepestIndex]] = nodeSaved

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

        // deepestIndex = null
        if (depths.length == 0) {
          node.depth--
          node.visited = true
          console.log('doSaveOne, saved the descendants, so saving the node')
          return save(node, maps).then((nodeSaved) => {
            console.log('didSaveNode, nodeSaved', nodeSaved)
            maps.ids[nodeSaved.id] = nodeSaved
            console.log('doSaveOne, saved node, node in maps:', maps.ids[nodeSaved.id])

            return nodeSaved
          })
        }

        const nodesToSave = []
        while ((deepestIndex = depths.indexOf(deepest)) > -1) {
          var nodeToSave = node.children[unsavedIndexes[deepestIndex]]
          if (nodeToSave.type != 'label') nodeToSave = maps.ids[nodeToSave.id]
          nodeToSave.index = unsavedIndexes[deepestIndex]
          nodesToSave.push(nodeToSave)

          // console.log('doSaveDeepestOne, while loop, deepestIndex:', deepestIndex);
          depths = depths.slice(deepestIndex+1)
          unsavedIndexes = unsavedIndexes.slice(deepestIndex+1)

          // console.log('doSaveDeepestOne, while loop, deepestIndex:', deepestIndex);
          // node.children[(unsavedIndexes[deepestIndex])] = doSaveDeepestOne(node.children[(unsavedIndexes[deepestIndex])], maps)
          // depths = depths.slice(deepestIndex+1)
          // unsavedIndexes = unsavedIndexes.slice(deepestIndex+1)
        }

        return saveArray(nodesToSave, [])
        .then((nodesSaved) => {
          console.log('savedArray, resolving');
          nodesSaved.forEach((nodeSaved) => {
            nodeSaved.visited = true
            maps.ids[nodeSaved.id] = nodeSaved
            console.log('doSaveOne, saved node, node in maps:', maps.ids[nodeSaved.id])

            node.children[nodeSaved.index] = nodeSaved
          })

          node.depth--
          // return save(node, maps).then((res) => {return resolve(res)})
          return node
        })

      })

  }

  function saveArray(nodes, saved) {

      if (nodes.length == 0) {
        console.log('saveArray, nodes is empty, resolving');
        return Promise.resolve(saved)
      }

      return doSaveOne(nodes.shift())
      .then((nodeSaved) => {
        console.log('saveArray, didSaveOne.then')
        saved.unshift(nodeSaved)

        // console.log('saveArray, saved node, nodes, saved:', nodes, saved);
        return saveArray(nodes, saved)
      })


  }

  tree = maps.ids[tree.id]

  const depths = tree.children.map((child) => {
    return child.depth
  })

  return doSave(tree, depths)
  .then(() => {
    return save(tree)
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

/*
function saveDeepestAsync(tree, maps, save) {
  function doSave(node, depths) {

    const deepest = Math.max(...depths)
    if (deepest == -1) {
      return Promise.resolve(node)
    }

    const deepestIndex = depths.indexOf(deepest)

    console.log('doSave, depths', depths)

    var child = node.children[deepestIndex]
    if (child.type != 'label') child = maps.ids[child.id]
    // this only saves the terminal node of the deepest path
    return doSaveOne(child, maps)
    .then((deepestSaved) => {
      console.log('doSave, didSaveOne.then');
      node.children[deepestIndex] = deepestSaved

      maps.ids[deepestSaved.id] = deepestSaved
      depths[deepestIndex]--

      // console.log('doSaveDeepest, didSaveDeepestOne, node', JSON.parse(JSON.stringify(deepestSaved)));
      return doSave(node, depths, maps)//.then((res) => {return resolve(res)})
    })
  }

  function doSaveOne(node) {

      console.log('doSaveOne, NODE', node);
      if (node.visited) return Promise.resolve(node)

      // console.log('doSaveDeepestOne', node);

      if (node.type == 'label') {
        console.log('node is a label, go is a DJ', node)
        console.log('node is a label, go is a DJ', maps.ids[node.to])
        if (node.terminal) {
          node.visited = true


          // the referenced node is by definition an ancestor of the current node,
          // so we save it for later, because this method traverses in the direction
          // from descendants to ancestors, so to set the id of the referenced node
          // as referee in this node, we need to first save that node.
          maps.terminals.push(node)
          return Promise.resolve(node)
        }

        if (maps.ids[node.to].visited) {
          console.log('node is a label, the referee is already visited');
          return Promise.resolve(node)
        }

        return doSaveOne(maps.ids[node.to]).then((nodeSaved) => {
          maps.ids[node.to] = nodeSaved
          console.log('doSaveOne, saved node, node in maps:', maps.ids[node.to])
          return nodeSaved
        })
      }

      // if (!node.children || node.children.length == 0) {
      if (!node.children || node.children.length == 0) {
        // console.log('doSaveDeepestOne, terminal node, saved', JSON.parse(JSON.stringify(node)));

        console.log('doSaveOne, node has no children, saving')
        node.visited = true
        return save(node, maps).then((nodeSaved) => {
          console.log('doSaveOne, didSave node, the node: ', nodeSaved)
          maps.ids[nodeSaved.id] = nodeSaved
          console.log('doSaveOne, saved node, node in maps:', maps.ids[nodeSaved.id])
          return nodeSaved
        })
      }

      // map children's lengths to an array, except those children that are already saved
      var depths = []
      var unsavedIndexes = []
      var i = 0; const len = node.children.length;
      for (i; i < len; i++) {
        if (node.children[i].visited) continue
        depths.push(node.children[i].depth)
        unsavedIndexes.push(i)
      }

      // the node can be saved only and only if all it's descendants
      // are saved (all it's children and all their children and so on)
      if (depths.length == 0) {
        node.depth--

        node.visited = true
        console.log('doSaveOne, descendants saved, saving')
        return save(node, maps).then((nodeSaved) => {

          maps.ids[nodeSaved.id] = nodeSaved
          console.log('doSaveOne, saved node, node in maps:', maps.ids[nodeSaved.id])

          return nodeSaved
        })
        // console.log('doSaveDeepestOne, descendants saved, saving.', JSON.parse(JSON.stringify(node)));
        // return node
      }

      const deepest = Math.max(...depths)
      var deepestIndex = depths.indexOf(deepest)

      var nextNode = node.children[unsavedIndexes[deepestIndex]]
      if (nextNode.type != 'label') nextNode = maps.ids[nextNode.id]
      console.log('doSaveOne, nextNode:', nextNode)
      // console.log('doSaveOne, nextNode again:', nextNode)

      // this only saves the terminal node of the deepest path
      return doSaveOne(nextNode)
      .then((nodeSaved) => {
        maps.ids[nodeSaved.id] = nodeSaved
        console.log('doSaveOne, saved node, node in maps:', maps.ids[nodeSaved.id])

        node.children[unsavedIndexes[deepestIndex]] = nodeSaved

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

        // deepestIndex = null
        if (depths.length == 0) {
          node.depth--
          node.visited = true
          console.log('doSaveOne, saved the descendants, so saving the node')
          return save(node, maps).then((nodeSaved) => {
            console.log('didSaveNode, nodeSaved', nodeSaved)
            maps.ids[nodeSaved.id] = nodeSaved
            console.log('doSaveOne, saved node, node in maps:', maps.ids[nodeSaved.id])

            return nodeSaved
          })
        }

        const nodesToSave = []
        while ((deepestIndex = depths.indexOf(deepest)) > -1) {
          var nodeToSave = node.children[unsavedIndexes[deepestIndex]]
          if (nodeToSave.type != 'label') nodeToSave = maps.ids[nodeToSave.id]
          nodeToSave.index = unsavedIndexes[deepestIndex]
          nodesToSave.push(nodeToSave)

          // console.log('doSaveDeepestOne, while loop, deepestIndex:', deepestIndex);
          depths = depths.slice(deepestIndex+1)
          unsavedIndexes = unsavedIndexes.slice(deepestIndex+1)

          // console.log('doSaveDeepestOne, while loop, deepestIndex:', deepestIndex);
          // node.children[(unsavedIndexes[deepestIndex])] = doSaveDeepestOne(node.children[(unsavedIndexes[deepestIndex])], maps)
          // depths = depths.slice(deepestIndex+1)
          // unsavedIndexes = unsavedIndexes.slice(deepestIndex+1)
        }

        return saveArray(nodesToSave, [])
        .then((nodesSaved) => {
          console.log('savedArray, resolving');
          nodesSaved.forEach((nodeSaved) => {
            nodeSaved.visited = true
            maps.ids[nodeSaved.id] = nodeSaved
            console.log('doSaveOne, saved node, node in maps:', maps.ids[nodeSaved.id])

            node.children[nodeSaved.index] = nodeSaved
          })

          node.depth--
          // return save(node, maps).then((res) => {return resolve(res)})
          return node
        })

      })

  }

  function saveArray(nodes, saved) {

      if (nodes.length == 0) {
        console.log('saveArray, nodes is empty, resolving');
        return Promise.resolve(saved)
      }

      return doSaveOne(nodes.shift())
      .then((nodeSaved) => {
        console.log('saveArray, didSaveOne.then')
        saved.unshift(nodeSaved)

        // console.log('saveArray, saved node, nodes, saved:', nodes, saved);
        return saveArray(nodes, saved)
      })


  }

  tree = maps.ids[tree.id]

  const depths = tree.children.map((child) => {
    return child.depth
  })

  return doSave(tree, depths)
  .then(() => {
    return save(tree)
  })
}
*/


function doSaveDeepest(node, depths, maps) {

  console.log('doSaveDeepest', depths);
  const deepest = Math.max(...depths)
  if (deepest == -1) {
    return node
  }

  const deepestIndex = depths.indexOf(deepest)

  // this only saves the terminal node of the deepest path
  var deepestSaved = doSaveDeepestOne(node.children[deepestIndex], maps)
  node.children[deepestIndex] = deepestSaved
  depths[deepestIndex]--

  console.log('doSaveDeepest, didSaveDeepestOne, node', JSON.parse(JSON.stringify(deepestSaved)));
  return doSaveDeepest(node, depths, maps)
  // var i = 0; const len = node.children.length;
  // for (i; i < len; i++) {
  //
  // }

}
// function doSaveDeepestOne(node, depths, branchIndex) {
function doSaveDeepestOne(node, maps) {
  if (node.saved) return node

  // console.log('doSaveDeepestOne', node);

  if (node.type == 'label') {
    if (node.terminalRef) {
      // the flag really just denotes that the node was visited
      // by the doSaveDeepestOne method
      node.saved = true

      // the referenced node is by definition an ancestor of the current node,
      // so we save it for later, because this method traverses in the direction
      // from descendants to ancestors, so to set the id of the referenced node
      // as referee in this node, we need to first save that node.
      maps.terminalRefs.push(node)
      return node
    }

    return doSaveDeepestOne(maps.ids[node.to], maps)
  }

  // if (!node.children || node.children.length == 0) {
  if (!node.children || node.children.length == 0) {
    console.log('doSaveDeepestOne, terminal node, saved', JSON.parse(JSON.stringify(node)));
    node.saved = true
    return node
  }

  // map children's lengths to an array, except those children that are already saved
  var depths = []
  var unsavedIndexes = []
  var i = 0; const len = node.children.length;
  for (i; i < len; i++) {
    if (node.children[i].saved) continue
    depths.push(node.children[i].depth)
    unsavedIndexes.push(i)
  }

  // the node can be saved only and only if all it's descendants
  // are saved (all it's children and all their children and so on)
  if (depths.length == 0) {
    node.depth--
    node.saved = true
    console.log('doSaveDeepestOne, descendants saved, saving.', JSON.parse(JSON.stringify(node)));
    return node
  }

  const deepest = Math.max(...depths)
  var deepestIndex = depths.indexOf(deepest)

  // this only saves the terminal node of the deepest path
  node.children[(unsavedIndexes[deepestIndex])] = doSaveDeepestOne(node.children[(unsavedIndexes[deepestIndex])], maps)

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

  // deepestIndex = null
  if (depths.length == 0) {
    node.depth--
    return node
  }

  while ((deepestIndex = depths.indexOf(deepest)) > -1) {
    // console.log('doSaveDeepestOne, while loop, deepestIndex:', deepestIndex);
    node.children[(unsavedIndexes[deepestIndex])] = doSaveDeepestOne(node.children[(unsavedIndexes[deepestIndex])], maps)
    depths = depths.slice(deepestIndex+1)
    unsavedIndexes = unsavedIndexes.slice(deepestIndex+1)
  }


  node.depth--
  console.log('deepestOne, depth--', node.depth);
  return node
}

function saveDeepest(tree, maps) {

  const depths = tree.children.map((child) => {
    return child.depth
  })

  return doSaveDeepest(tree, depths, maps)
}

module.exports = {
  saveDeepest,
  saveDeepestAsync,
  traverseAsync,
  describeToSave
}
