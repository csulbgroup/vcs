const express = require('express');
const fs = require('fs');
const path = require('path');
var bodyParser = require('body-parser')

const router = express.Router();
router.use(bodyParser.urlencoded({
    extended: true
}));
router.use(bodyParser.json());
var mkdirp = require('mkdirp');

const {
    label,
    checkOut,
    checkIn,
    mergeOut
} = require("./gitcommands");



//wildcard url for fetching file structure at particular url
router.get('/repos(/*)?', (req, res) => {
    let pathToRead = __dirname + req.url;
    console.log(pathToRead);
    if (fs.lstatSync(pathToRead).isDirectory() == true) {
        fs.readdir(pathToRead, (err, files) => {
            if (req.url == '/repos') {
                let repoNames = []
                files.forEach(file => {
                    if (!file.includes(".")) repoNames.push(file)
                })

                res.render('index', {
                    files: repoNames
                });
            } else {
                res.render('index', {
                    files: files
                });
            }

        });
    } else {
        res.sendFile(pathToRead);
        // fs.readFile(pathToRead, 'utf8', function (err, contents) {
        //     res.json(contents)
        // })
    }

});


router.get('/home', (req, res) => {
    res.render('homepage')
})

router.get('/', (req, res) => {
    res.render('homepage')
})

router.get('/manifests', (req, res) => {

    let manifestNames = readManifestNames();
    res.render('index', {
        files: manifestNames
    });
})

router.get('/manifestnames', (req, res) => {
    let manifestNames = readManifestNames();
    res.json(manifestNames);
})

router.post('/checkin', (req, res) => {
    //send true if trying to merge in else send false
    checkIn(req.body.sourcePath, false);
    res.sendStatus(200)
})

router.post('/checkout', (req, res) => {
    checkOut(req.body.manifestFileName.trim(), req.body.branchName.trim(), req.body.localRepoPath.trim());
    res.sendStatus(200)
})

router.post('/createrepo', (req, res) => {
    let pathForFile = __dirname + "/repos/";
    pathForFile = replaceBackSlash(pathForFile)
    let manifestPath = pathForFile + req.body.fileName.trim() + 'manifest.json';
    pathForFile += req.body.fileName.trim()
    mkdirp(pathForFile, (err) => {
        let fName = req.body.fileName.trim()
        if (err) res.sendStatus(500)
        let manifestData = {
            'command': 'createrepo',
            'sourceFolder': pathForFile,
            'destFolder': pathForFile,
            'DataTime': Date.now(),
            'fileNames': [],
            'labels': []
        };


        fs.appendFile(manifestPath, JSON.stringify(manifestData), (error) => {
            if (error) {
                res.sendStatus(500)
                console.log(error);
            } else {
                res.sendStatus(200);
            }
        })

    });
})

router.post('/label', (req, res) => {
    label(req.body.manifestFileName.trim(), req.body.labelName.trim())
    res.sendStatus(200);
})

router.get('/new/repos(/*)?', (req, res) => {


    res.render('createfile');
});

router.post('/new/repos(/*)?', (req, res) => {
    let urlArray = []
    if (req.url.includes('//')) {
        tempUrlArray = req.url.split('//')
        let tempUrl = tempUrlArray[0] + '/' + tempUrlArray[1]
        urlArray = tempUrl.split('/')
    } else {
        urlArray = req.url.split('/');
    }

    console.log(urlArray[3] + '____________________+++++++++++++++')
    if (req.body.file) {
        console.log('***' + req.body.fileName.trim() + '++++ ' + req.body.fileData)
        let manifestPath = __dirname + '/repos/' + urlArray[3] + 'manifest.json';
        manifestPath = replaceBackSlash(manifestPath)
        console.log(manifestPath)
        let manifestObject = JSON.parse(fs.readFileSync(manifestPath));
        manifestObject.DataTime = Date.now();
        // fs.mkdirSync(destDir);
        let pathForFile = __dirname + "/repos/";
        pathForFile = replaceBackSlash(pathForFile)
        for (let i = 3; i < urlArray.length; i++) {
            pathForFile += urlArray[i] + '/'
        }
        pathForFile += req.body.fileName.trim()
        console.log('Path to file is ' + pathForFile)
        mkdirp(pathForFile, (err) => {
            if (err) res.sendStatus(500)
            else {
                let artifactFileName = calculateArtifactId(req.body.fileData);
                let pathToFile = pathForFile + '/' + artifactFileName;
                let pathToFileForManifestFile = pathForFile;
                let fName = req.body.fileName.trim()
                let fileObject = {
                    fileName: fName,
                    relativePath: pathToFileForManifestFile,
                    artifactId: artifactFileName
                }
                manifestObject.fileNames.push(fileObject);
                fs.writeFileSync(manifestPath, JSON.stringify(manifestObject));

                fs.appendFileSync(pathToFile, req.body.fileData);
                res.sendStatus(200);
            }
        });
    } else {
        let pathForFile = __dirname + "/repos/";
        for (let i = 3; i < urlArray.length; i++) {
            pathForFile += urlArray[i] + '/'
        }
        pathForFile += req.body.fileName.trim()
        mkdirp(pathForFile, (err) => {
            if (err) res.sendStatus(500)
            res.sendStatus(200);
        });
    }



});


router.post("/merge/mergeout", (req, res) => {

    let sourceRepo = req.body.sourceRepo;
    let targetRepo = req.body.targetRepo;

    mergeOut(sourceRepo, targetRepo)
    res.sendStatus(200);
    // let manifestFileNames = readManifestNames();

    // manifestFileNames.forEach(file =>{
    //     if(file.includes)
    // })
})

router.post("/merge/mergein", (req, res) => {
    let sourcePath = req.body.sourcePath;
    //send true if trying to merge in else send false
    checkIn(sourcePath, true);
    res.sendStatus(200);
})



//CREATE NEW REPO
router.post("/create/repo", (req, res) => {
    let repoName = __dirname + "/repos/" + req.body.repoName.trim();
    fs.mkdir(repoName, (err) => {
        if (err) res.sendStatus(500);
        res.sendStatus(200);

    });
});


//CREATE FOLDER OR FILE IN CURRENT PATH
router.post("/repos(/*)?", (req, res) => {
    if (req.body.fileName != null || req.body.fileName != null) {
        let path = __dirname + req.url + "/" + req.body.fileName.trim();
        console.log(path);
        fs.appendFile(path, req.body.fileData, (err) => {
            if (err) res.sendStatus(500);
            else res.sendStatus(200);
        })
    } else if (req.body.folderName != null || req.body.folderName != null) {
        let path = __dirname + req.url + "/" + req.body.folderName;
        console.log(path);
        fs.mkdir(path, {
            recursive: true
        }, (err) => {
            if (err) res.sendStatus(500);
            else res.sendStatus(200);
        });
    }

});

function calculateArtifactId(contents) {


    let len = contents.length;
    let weights = [1, 7, 3, 7, 11];
    let checkSum = 0;
    let j = 0;
    for (let i = 0; i < len; i++) {
        j = j % weights.length;
        checkSum += weights[j++] * contents.charCodeAt(i);
    }
    let modulus = Math.pow(2, 31) - 1;
    checkSum = checkSum % modulus;
    return `${checkSum}-L${len}.txt`;
}

function replaceBackSlash(dirName) {
    let dest = dirName;
    pathArray = dest.split('\\');
    dest = "";
    pathArray.forEach((destElem) => {
        if (dest.length != 0)
            dest = dest + '/' + destElem;
        else
            dest += destElem;
    })
    return dest;
}

function readManifestNames() {
    let pathToRead = __dirname + '/repos';
    let files = fs.readdirSync(pathToRead);
    let manifestNames = []
    files.forEach(file => {
        if (file.includes(".")) manifestNames.push(file)
    })
    return manifestNames;


}


module.exports = router;