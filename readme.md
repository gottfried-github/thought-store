# Overview
This is part of a personal project I'm currently working on. It saves a tree-structured data to a Mongo database. It uses the official MongoDb Node.js driver and express. The core business logic is very rough - it's just something to try out the idea.

The `crud-tree.js` and `crud-tree-lib.js` is the core, which `api.js` uses directly. The `main.js` hooks everything up.

# Details
## Depth-first traversal
1. Determine the depths of the nodes in a tree. [#L179](https://github.com/gottfried-github/thought-store/blob/d2e0cbdee84e9be320f135d9b1fd7a31c666a28d/src/crud-tree-lib.js#L179)
2. At each level, visit the deepest nodes until terminal nodes are reached. E.g., [#L63](https://github.com/gottfried-github/thought-store/blob/d2e0cbdee84e9be320f135d9b1fd7a31c666a28d/src/crud-tree-lib.js#L63), [#L87](https://github.com/gottfried-github/thought-store/blob/d2e0cbdee84e9be320f135d9b1fd7a31c666a28d/src/crud-tree-lib.js#L87)
3. Then, backtrack, saving the nodes along the way. E.g., [#L31](https://github.com/gottfried-github/thought-store/blob/d2e0cbdee84e9be320f135d9b1fd7a31c666a28d/src/crud-tree-lib.js#L31)
4. Determine the depths of the nodes in the tree, not taking into account the already traversed nodes. E.g., [#L53](https://github.com/gottfried-github/thought-store/blob/d2e0cbdee84e9be320f135d9b1fd7a31c666a28d/src/crud-tree-lib.js#L53)

Repeat until the depths of the top nodes are zero.
