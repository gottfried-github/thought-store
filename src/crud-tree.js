// const MongoClient = require('mongodb').MongoClient
const Dev = require('../dev.js')
const DBRef = require('mongodb').DBRef
const ObjectId = require('mongodb').ObjectID
const lib = require('./crud-tree-lib.js')
// const trees = require('./fake-trees.js')
const modelClasses = require('./models.js')

class CrudTree extends Dev {
  constructor(models, options) {
    super((options.devEnv) ? options.devEnv : false)

    options = options || {}
    this.devEnv = options.devEnv || false
    // this.logs = []

    // this.client = new MongoClient(url, options.clientOps || {})
    // this.dbName = dbName

    // this.init()
    // .then((lastCreatedColl) => {
    //   this.log("created collections", lastCreatedColl)
    // })
    // .catch((err) => {
    //   this.log("errored somewhere during init", err)
    // })

    // here I should also check if the models are initialized
    console.log('crudTree, constructor, modelClasses', modelClasses)
    var modelsErr =
      (!models.entities || !models.resources)
        ? new Error("models.entities and models.resources are both required")
        : (!(models.entities instanceof modelClasses.Entities) || !(models.resources instanceof modelClasses.Resources))
          ? new TypeError("models must be instances of classes, defined in models")
          : null

    if (modelsErr) throw modelsErr

    this.entities = models.entities
    this.resources = models.resources
  }

  /*
  init() {
    return this.client.connect()
    .then(() => {
      try {
        this.db = this.client.db(this.dbName)
      } catch(err) {
        return Promise.reject(err)
      }

      this.entities = new models.Entities(this.db, {log: this.log.bind(this)})
      this.resources = new models.Resources(this.db, {log: this.log.bind(this)})

      return this.entities.init()
      .then(() => {
        return this.resources.init()
      })
    })
  }
  */

  // this gets passed as a callback to saveDeepest, so
  // we can be sure that for every @node, it's descendants
  // (if it has those) are already saved/updated
  saveOne(node, map) {
    this.log('saveOne, node:', node)
    if (node.status == 'new') {
      this.log('saveOne, a node status is new', node)
      if (node.type == 'resource') {
        const resource = new this.resources.Resource(node.text)
        // this.log('saveOne, newly created resource:', resource)
        return resource.save()
        .then((instance) => {
          map.saved[instance.doc._id.toHexString()] = instance
          map.toSaved[node._id] = instance.doc._id.toHexString()
          // map.saved[instance.doc._id.toHexString()] = instance
          // map.toSaved[node._id] = instance.doc._id.toHexString()

          this.log('saveOne, saved resource:', instance)
          return instance
        })
      } else if (node.type == 'entity') {
        const refsNew = []

        node.refs.forEach((ref) => {
          const refNew = {
            // as we save or update nodes (especially if we save new nodes), we will add
            // them to the map.saved. But we will not update refs of ancestrial nodes to point
            // to new ids. So we will have the toSaved mapping of old ids to new ones.
            coll: map.saved[map.toSaved[ref.to || ref.toTerminal]].collection.collectionName
          }

          if (ref.toTerminal) {
            refNew.toTerminal = false
          }

          if (ref.to) {
            refNew.to = map.saved[map.toSaved[ref.to]]._id
          }

          refsNew.push(refNew)
        })

        const entity = new this.entities.Entity(refsNew)
        // this.log('saveOne, newly created entity:', entity)
        return entity.save()
        .then((instance) => {
          map.saved[instance.doc._id.toHexString()] = instance
          map.toSaved[node._id] = instance.doc._id.toHexString()

          // check for terminal refs and add the node to maps if there is
          // for (var i = 0; i < instance.doc.refs.length; i++) {
          //   if (instance.doc.refs[i].toTerminal) {
          //     // we use the real id, but the superficial refs, because using those
          //     // we will be able to substitute patched toTerminal's with proper ids
          //     map.withTerminalRefs[instance.doc._id] = node
          //     break
          //   }
          // }

          this.log('saveOne, saved entity:', instance)
          return instance
        })
      }
    } else if (node.status == 'changed') {
      this.log('a node status is changed', node)
      // return
      if (node.type == 'resource') {
        return this.resources.update(
          new ObjectId(node._id),
          node.text
        )
        .then((instance) => {
          map.saved[instance._id.toHexString()] = instance
          map.toSaved[instance._id.toHexString()] = instance._id.toHexString()

          this.log('updated resource', instance)
          return instance
        })

      } else if (node.type == 'entity') {
        const refsNew = []

        node.refs.forEach((ref) => {
          const refNew = {
            // as we save or update nodes (especially if we save new nodes), we will add
            // them to the map.saved. But we will not update refs of ancestrial nodes to point
            // to new ids. So we will have the toSaved mapping of old ids to new ones.
            coll: map.saved[map.toSaved[ref.to || ref.toTerminal]].collection.collectionName
          }

          if (ref.toTerminal) {
            refNew.toTerminal = false
          }

          if (ref.to) {
            refNew.to = map.saved[map.toSaved[ref.to]].doc._id
          }

          refsNew.push(refNew)
        })

        this.log('saveOne, entity is to update, new refs:', refsNew)

        return this.entities.update(new ObjectId(node._id), refsNew)
        .then((instance) => {
          map.saved[instance._id.toHexString()] = instance
          map.toSaved[instance._id.toHexString()] = instance._id.toHexString()

          this.log('updated entity', instance)
          return instance
        })
      }
    } else if (node.status == 'unchanged') {
      this.log('node unchanged, node', node)
      var instance = null

      if (node.type == 'entity') {
        instance = new this.entities.Entity(node.refs.map((ref) => {
          var refNew = {coll: map.saved[map.toSaved[ref.to || ref.toTerminal]].collection.collectionName}
          if (ref.to) refNew.to = ref.to
          if (ref.toTerminal) refNew.toTerminal = ref.toTerminal
          return refNew
        }), {id: node._id})
      } else if (node.type == 'resource') {
        instance = new this.resources.Resource(node.text, {id: node._id})
      } else {
        return Promise.reject(new Error('node must have a type, instead got', node.type))
      }

      this.log('node unchanged, instance', instance)
      instance.doc = node
      map.saved[instance._id] = instance
      map.toSaved[instance._id] = instance._id

      return Promise.resolve(instance)
    }
  }

  /**
    @param map @description {ids: {"<node's id>": <node>}}
  */
  saveTree(tree, map) {
    const treeDescribed = lib.describeToSave(tree, map)
    this.log('described tree to save, tree', treeDescribed)
    map.saved = {}
    map.toSaved = {}
    map.withTerminalRefs = {}

    // return
    return lib.saveDeepestAsync(tree || this.trees.tree0dbsSparse, map, this.saveOne.bind(this))
    // .then((savedTree) => {
    //   this.log('saved tree,', savedTree)
    //   return savedTree
    // })
  }

  doQueryTree(nodeId) {
    return this.entities.collection.aggregate([
      {$match: {
        _id: nodeId
      }},
      {$graphLookup: {
        from: 'resources',
        connectFromField: 'refs.to',
        startWith: '$refs.to',
        connectToField: '_id',
        as: 'resourcesRoot',
        depthField: 'depth'
      }},
      {$graphLookup: {
        from: 'entities',
        connectFromField: 'refs.to',
        startWith: '$refs.to',
        connectToField: '_id',
        as: 'entities',
        depthField: 'depth'
      }},
      {$unwind: '$entities'},
      {$project: {
        resourcesRoot: 1,
        refs: 1,
        referee: '$entities'
      }},
      {$graphLookup: {
        from: 'resources',
        connectFromField: 'referee.refs.to',
        startWith: '$referee.refs.to',
        connectToField: '_id',
        as: 'resources',
        depthField: 'depth'
      }},
      // {$graphLookup: {
      //   from: 'views',
      //   connectFromField: 'child.children.to',
      //   startWith: '$child.children.to',
      //   connectToField: '_id',
      //   as: 'views',
      //   depthField: 'depth'
      // }},
    ])
    .toArray()

  }

  queryTree(nodeName) {
    if (!nodeName) {
      this.doQueryTree(this.tree.doc._id)
      .then((docs) => {
        this.log('queriedTree, docs', docs)
      })
      .catch((err) => {
        this.log('queryTree rejected,', err)
      })
    } else {
      this.one.findOne({name: nodeName})
      .then((result) => {
        return this.doQueryTree(result._id)
      })
      .then((docs) => {
        this.log('queriedTree, docs', docs)
      })
      .catch((err) => {
        this.log('queryTree rejected,', err)
      })
    }
  }

  doBuildMap(aggregatedNodes) {
    const maps = {}

    var i = 0; const len = aggregatedNodes.length
    for (i; i < len; i++) {
      const referee = aggregatedNodes[i].referee

      const refereeId = referee._id.toHexString()
      if (!maps[refereeId]) maps[refereeId] = referee

      if (aggregatedNodes[i].resources && aggregatedNodes[i].resources.length > 0) {
        for (var ii = 0; ii < aggregatedNodes[i].resources.length; ii++) {
          const resource = aggregatedNodes[i].resources[ii]
          const resourceId = resource._id.toHexString()

          if (!maps[resourceId]) maps[resourceId] = resource
        }
      }
    }

    return maps
  }

  buildMap(queryResult) {
    const map = this.doBuildMap(queryResult)
    queryResult[0].resourcesRoot.forEach((resource) => {map[resource._id.toHexString()] = resource})
    map.root = {
      _id: queryResult[0]._id.toHexString(),
      refs: queryResult[0].refs
    }

    this.log('maps', map)
    return map
  }
}

module.exports = CrudTree
