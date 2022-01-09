
// Accès à l'IHM depuis un navigateur
// http://localhost:3000

var fs = require('fs')
var express = require('express')

var robot = require('./robot.js')


// à modifier !!!!!!
// dossier contenant les fichiers HTML que le serveur Web pourra envoyer au navigateur
var rep_html = "C:\\Users\\marie\\OneDrive\\Documents\\L3 Info\\S5\\Objetc connectés et robotique\\TP\\TP3b\\TP3b - Gestion des missions - Deuxième approche, solution simplifiée - Projet final-20211129"
if (!fs.existsSync(rep_html)) {
    console.log("ERREUR : fichier non trouvé : "+rep_html)
}

// port du serveur Web
var port_web = 3000


/****************************************************************************/
/*************************** serveur web ************************************/
/****************************************************************************/


var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", express.static(rep_html,{index:'index.html'}));

app.post('/cmd',function(req,res) {
    var cmd = req.body.cmd
    console.log("cmd = "+cmd)
    robot.exec(cmd)
    res.send({mess : "ok"})

 })

 app.post('/distances',function(req,res) {
    
    res.send({dist : robot.get_distances()}) // on retourne le tableau des distances

 })


var server = app.listen(port_web, function() {
    console.log('Express server listening on port ' + port_web)
});


