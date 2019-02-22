// const Buffer = require('buffer').Buffer
// const utf8 = require('utf8')
// const Binary = require('mongodb').Binary
const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectID
// const db = require("./connection.js")

/*
db.createCollection("resources", {
  validator: {
    $jsonSchema: resouces
  },
  validationAction: "error"
})

db.createCollection("textResources", {
  validator: {
    $jsonSchema: textResouces
  },
  validationAction: "error"
})


// db.createIndex('resources')
*/

const subSchemaStr = {
  bsonType: "object",
  required: ['_id', 'text'],
  properties: {
    _id: {
      bsonType: "objectId"
    },
    text: {
      bsonType: "string"
    }
  }
}

const subSchemaNum = {
  bsonType: "object",
  required: ['_id', 'quantity'],
  properties: {
    _id: {
      bsonType: "objectId"
    },
    quantity: {
      bsonType: "number"
    }
  }
}

const mainSchema = {
  type: "object",
  properties: {
    _id: {
      bsonType: "objectId"
    },
    value: {
      bsonType: "object",
      oneOf: [subSchemaStr, subSchemaNum]
    }
  }
}

const url = "mongodb://localhost:27017"
const client = new MongoClient(url)
const dbName = "test-db"

function connect() {
  return new Promise((resolve, reject) => {
    client.connect((err, client) => {
      if (err) {
        reject(err)
      } else {
        resolve(client)
      }
    })
  })
}

const simpleSchemaStr = {
  bsonType: "object",
  properties: {
    // _id: {
    //   bsonType: "objectId"
    // },
    text: {
      bsonType: "string"
    },
    // additionalProperties: false
  }
}

const simpleSchemaNum = {
  bsonType: "object",
  properties: {
    // _id: {
    //   bsonType: "objectId"
    // },
    amount: {
      bsonType: "number"
    },
    // additionalProperties: false
  }
}

const compoundSchema = {
  bsonType: "object",
  properties: {
    _id: {
      bsonType: 'objectId'
    },
    value: {
      anyOf: [
        {bsonType: 'string'},
        {bsonType: 'number'},
        // {properties: {nestedA: {bsonType: "string"}}},
        // {properties: {nestedB: {bsonType: "string"}}},

        {bsonType: "object", properties: {nestedC: {bsonType: "string"}}},
        {
          bsonType: "object",
          properties: {
            nestedX: {bsonType: "number"},
            nestedY: {bsonType: "string"},
            nestedZ: {bsonType: "bool"},
          }
        },
      ]
      // oneOf: [{bsonType: 'string'}, {bsonType: 'number'}, {bsonType: 'object', properties: {nestedV: {bsonType: "string"}}}]
      // oneOf: [simpleSchemaNum, simpleSchemaStr]
    }
  },
  // additionalProperties: false
}

const testSchema = {
  properties: {
    someOf: {
      oneOf: []
    }
  }
}

const compoundSchema01 = {
  // bsonType: "object",
  oneOf: [
    {properties: {text: {bsonType: "string"}} },
    {properties: {amount: {bsonType: "number"}} }
  ],
  // additionalProperties: false
}

const compoundSchemaArchi = {
  properties: {
    value: { allOf: [compoundSchema01] }
  }
}

const docNum = {
  // _id: new ObjectId(),
  value: {
    // _id: new ObjectId(),
    quantity: parseInt(56)
  }
}

const simpleDocStr = {
  // _id: new ObjectId(),
  text: "some fucking string" //.toString() // parseInt(55)
  // text: Buffer.from("some text here", 'utf8') //.toString() // parseInt(55)
  // text: utf8.encode("some text here") //.toString() // parseInt(55)
}

const simpleDocNum = {
  // _id: new ObjectId(),
  amount: 55 //.toString() // parseInt(55)
  // text: Buffer.from("some text here", 'utf8') //.toString() // parseInt(55)
  // text: utf8.encode("some text here") //.toString() // parseInt(55)
}

const compoundDocStr = {
  _id: new ObjectId(),
  value: "this is a eesay, not essay"
}

const compoundDocNum = {
  _id: new ObjectId(),
  value: 67
}

const compoundDocObjA = {
  _id: new ObjectId(),
  value: {nestedA: "nestedStringA"}
}

const compoundDocObjC = {
  _id: new ObjectId(),
  value: {nestedC: "nestedStringC"}
}

const compoundDocObjXYZ = {
  _id: new ObjectId(),
  value: {
    nestedX: 77,
    nestedY: "nestedStringC",
    nestedZ: false,
  }
}

const compoundDocObjXYZ01 = {
  _id: new ObjectId(),
  value: {
    nestedX: 77,
    nestedY: "nestedStringC",
    nestedZ: false,
  }
}

class TestIt {
  constructor() {
    this.init()
  }

  init() {
    return connect().then((client) => {
      this.client = client
      const db = client.db(dbName)
      return db.dropDatabase()
    }).then(() => {
      this.db = this.client.db(dbName)
    })
  }

  doTestCompound() {
    return this.db.createCollection("compound", {
      validator: {
        $jsonSchema: compoundSchema
      },
      validationAction: "error"
    }).then((coll) => {
      this.compoundColl = coll
      console.log('compound.insert docStr: ', simpleDocStr);
      return coll.insertOne(simpleDocStr)
    })

    .then((result) => {
      console.log('compound.insert docStr, result: ', result);
      console.log('compound.insert docNum: ', compoundDocObjXYZ);
      return this.compoundColl.insertOne(compoundDocObjXYZ)
    })
    .then((result) => {
      console.log("compound.inserted docNum, result: ", result);
      // const docRandom = {
      //   _id: new ObjectId(),
      //   value: false
      // }

      // console.log('compound.insert random doc:', docRandom);
      return this.compoundColl.insertOne(compoundDocObjC)
    })
    .then(res => console.log('inserted XYZ doc, res:', res))
  }

  doTestSimpleStr() {
    return this.db.createCollection("simpleStr", {
      validator: {
        $jsonSchema: simpleSchemaStr
      },
      validationAction: "error"
    }).then((coll) => {
      this.simpleStrColl = coll
      console.log('simpleDocNum: ', simpleDocStr);
      return coll.insertOne(simpleDocStr)
    }, (err) => {
      console.log("createCollection err: ", err);
      return Promise.reject(err)
    })
  }

  doTestSimpleNum() {
    return this.db.createCollection("simpleNum", {
      validator: {
        $jsonSchema: simpleSchemaNum
      },
      validationAction: "error"
    }).then((coll) => {
      this.simpleNumColl = coll
      console.log('inserting simpleDocNum: ', simpleDocNum);
      return coll.insertOne(simpleDocNum)
    }, (err) => {
      console.log("createCollection err: ", err);
      return Promise.reject(err)
    })
  }

  testCompound() {
    return this.doTestCompound()
    .catch((err) => {
      console.log("testCompound, something gone wrong, err: ", err);
      this.testCompoundErr = err
    })
    .finally(() => {

    })
  }

  testSimpleStr() {
    return this.doTestSimpleStr()
    .catch((err) => {
      console.log("testSimpleStr, something gone wrong, err: ", err);
      this.testSimpleStrErr = err
    })
    .finally(() => {

    })
  }

  testSimpleNum() {
    return this.doTestSimpleNum()
    .catch((err) => {
      console.log("testSimpleStr, something gone wrong, err: ", err);
      this.testSimpleNumErr = err
    })
    .finally(() => {

    })
  }

}

/*
function doIt() {
  var db = null

  return connect()
  .then((client) => {
    db = client.db(dbName)
    return db.dropDatabase()
    .then(() => {console.log('dropped database'); return client})
  })
  .then((client) => {
    db = client.db(dbName)
    return db.createCollection("simpleStr", {
      validator: {
        $jsonSchema: simpleSchemaStr
      },
      validationAction: "error"
    })
  })

  .then((simpleStr) => {
    console.log('inserting docStr: ', simpleDocStr);
    return simpleStr.insertOne(simpleDocStr)
  }, (err) => {
    console.log("createCollection err: ", err);
    return Promise.reject(err)
  })
  .then((result) => {
    console.log("inserted docStr, result: ", result);
    console.log('inserting docNum: ', docNum);
    return simpleStr.insertOne(docNum)
  }, (err) => {
    console.log('docStr insert err: ', err);
    return Promise.reject(err)
  })

  .then((result) => {
    console.log("inserted docNum, result: ", result);
    return result
  }, (err) => {
    console.log('docNum insert err: ', err);
    return Promise.reject(err)
  })

  .catch((err) => {
    console.log(err)
    return db
  })
  .finally(() => {
    console.log('finally, db', db);
    return db
  })
}
*/

// function dropDb(db) {
//   return db.dropDatabase()
// }

// doIt()

module.exports = {env: new TestIt()}
