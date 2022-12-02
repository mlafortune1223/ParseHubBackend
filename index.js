const express = require('express');
const app = express();
const PORT = 3000;
const root = require("./root.json")
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    next();
});

function findPathsToKey(options) {
    let results = [];

    (function findKey({
        key,
        obj,
        pathToKey,
    }) {
        const oldPath = `${pathToKey ? pathToKey + "/" : ""}`;
        if (obj.hasOwnProperty(key)) {
            results.push(`${oldPath}${key}`);
            return;
        }

        if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
            for (const k in obj) {
                if (obj.hasOwnProperty(k)) {
                    if (Array.isArray(obj[k])) {
                        for (let i = 0; i < obj[k].length; i++) {
                            findKey({
                                obj: obj[k][i],
                                key,
                                pathToKey: `${oldPath}${k}[${i}]`,
                            });
                        }
                    }

                    if (obj[k] !== null && typeof obj[k] === "object") {
                        findKey({
                            obj: obj[k],
                            key,
                            pathToKey: `${oldPath}${k}`,
                        });
                    }
                }
            }
        }
    })(options);
    let filledWithChildren = results.toString()
    let withoutChildren = filledWithChildren.replace(/children\//g, '')
    return withoutChildren;
}

function customFilter(object, key) {
    //check that the object being mapped through has the key that is being searched for
    if (object.hasOwnProperty(key) && object[key]) {
        //if it has kids, its a folder, and if the folder has folders, we gotta go get those kids, grankids if you will
        if (object[key].children) {
            var aboutToLoseChildren = object[key].children
            Object.entries(aboutToLoseChildren).forEach(property => {
                property.map(thing => {
                    if (typeof thing === "object" && thing.type === "dir") {
                        const { children: remove, ...saidGoodbye } = aboutToLoseChildren[property[0]]
                        aboutToLoseChildren[property[0]] = saidGoodbye
                    }
                })
            })
            return ({ result: aboutToLoseChildren, type: "dir" })
        }
        else {
            return ({ result: object[key], type: "file" })
        }
    }
    //recursivly calls itself searching the entire filetree
    for (var k of Object.keys(object)) {
        if (typeof object[k] === "object") {
            var o = customFilter(object[k], key);
            if (o !== null && typeof o !== 'undefined')
                return o;
        }
    }
    return null;
}

app.get("/path", (request, response) => {
    let search = request.query.path
    const pathArray = search.split("/")
    const endGoal = pathArray[pathArray.length - 1]
    const tempRoot = JSON.parse(JSON.stringify(root))
    const { result, type } = customFilter(tempRoot, endGoal)
    const foundPath = findPathsToKey({ obj: root, key: endGoal })
    result && (foundPath == search) ? response.status(200).json({ result, foundPath, type }) : response.status(404).json({ error: "Couldn't find the path you were looking for" })
})

app.listen(PORT, (error) => {
    if (!error)
        console.log("Server is Successfully Running, and App is listening on port " + PORT)
    else
        console.log("Error occurred, server can't start", error);
}
);