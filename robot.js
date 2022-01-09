
var fs = require('fs')
var express = require('express')
const { setTimeout } = require('timers')
//const { exec } = require('child_process')
//const { inherits } = require('util')

var usb = require("./usb.js")



var lcmd = null // liste des séquences de commandes à exécuter
// séquences Arduino et instructions de contrôle

var num = null // numéro de la séquence de commandes courante

var env = [] // environnement d'exécution
// contient des objets
// 3 champs : etiq (étiquette), pos (position dans le tableau lcmd), v : valeur (compteur d'exécution)


var distances = null // contient les dernières mesures de distances
// l'IHM Web recupère ce tableau en appelant la fonction get_distances
var dist1=null;
var dist2=null;
var d=null;
var vg=150;
var vd=150;
var it=0;

var chunk = ""; // on reçoit la réponse de l'Arduino par morceaux

usb.setCallback( function(s) {

    // on attend la réponse de l'Arduino
    // l'Arduino envoie une réponse après l'exécution d'un séquence de commandes
    // quand une réponse arrive, on la mémorise dans etat
    // ensuite on envoie la séquence suivante à l'Arduino


    chunk += s;

    if (chunk.indexOf("\n")) { // si on a reçu toute la ligne de réponse

        console.log("usb : "+chunk)

        // on reçoit la réponse de l'Arduino en JSON
    
        if (chunk.startsWith("{")) { // on a une réponse JSON
            var etat = JSON.parse(chunk)

            if (etat.dist.length > 0) {
                distances = etat.dist
                // des mesures de distances ont été efectuées
                // on les garde en méméoire
				/*if(d==1){
					dist1=etat.dist
				}else if(d==2){
					dist2=etat.dist
				}*/
            }
        
            exec()
            // chaque fois qu'on reçoit une réponse de l'Arduino,
            // on exécute exec pour conitnuer la mission courante
        
        }

        chunk = ""
         
    }
     // note : il faudrait prévoir le cas où l'Arduino ne répond plus
 
})


// recherche d'une mesure de distance dans le tableau des distances
// paramètres : tableau des distances et direction
function chercher_dist(tdist,dir) {

    if (tdist == null) return null

    for (var i=0 ; i<tdist.length ; i+=3) {
        if (tdist[i] == dir) {
            return [tdist[i], tdist[i+1], tdist[i+2]]
        }
    }
    return null
}

function init() {
    lcmd = null
    num = null
    env = []

}


function exec(m) {

    if( typeof m !== 'undefined') { // si le paramètre m est fourni, on démarre une nouvelle mission
        init()
        lcmd = m
        num = 0
        console.log("nouvelle mission : "+JSON.stringify(m))
    }

    if (lcmd == null) {
        console.log("mission terminée")
        init()
        return
    }

    if (num >= lcmd.length) {
        console.log("Mission terminée. Toutes commandes ont été exécutées")
        init()
        return
    }
 
    var cmd = lcmd[num]
    num++

    if (cmd instanceof Array) { // si c'est une instruction de contrôle
        if (cmd[0] == "iterer") {
            var pos = getenv(cmd[1])
            if (pos == null) {
                console.log("ERREUR : itération impossible, étiquette non définie : ",cmd[1])
                return
            }

            env[pos].v++ // on incrémente le compteur d'itération
            if (env[pos].v >= cmd[2]) {
                console.log("fin iterer")
                init()
                return
            }

            num = env[pos].pos // on se positionne sur la prochaine commande à exécuter
            exec() // on exécute
            return
        }
		//-----------------------NOS FONCTIONS-------------------------------------
        //FONCTION 1
		else if(cmd[0]=="ma_dist1"){
			dist1=distances
			console.log("distance1 :"+ dist1[1])
            exec()
			return
		}else if(cmd[0]=="avancer vitesse vg vd"){
			var car="[[mga "+vg+"][mda "+vd+"][t 350]]";
			time = Date.now(); 
			console.log("exec "+car)
			usb.write(car)
			return		
		}
		else if(cmd[0]=="ma_dist2"){
				dist2=distances
				console.log("distance2 :"+dist2[1])
				exec()
				return 
		}
		else if(cmd[0]=="si distances differentes"){
			var pos = getenv(cmd[1])
			vg=130;
			vd=130;
            if (pos == null) {
                console.log("ERREUR : itération avancer_modif_droit étiquette non définie : ",cmd[1])
                return
            }
            env[pos].v++ 
            if (dist2[1]-7<=dist1[1] && dist1[1]<=dist2[1]+7) { 
                console.log("fin si distance égales")
                exec()
                return
            }else if(dist2[1]<dist1[1]){
				vd=240;
			}else if(dist1[1]<dist2[1]){
				vg=240;
			}
            num = env[pos].pos
            exec()
            return
		}

		//FONCTION 2
		else if(cmd[0]=="avancer vitesse"){
			if(it<(cmd[1]-1)){
				var pos = getenv(cmd[1])
	            if (pos == null) {
	                console.log("ERREUR : itération longer_droit étiquette non définie : ",cmd[1])
	                return
	            }
	           	num = env[pos].pos
	            it++
	            exec() 
			}
            return
		}
		else if (cmd[0].startsWith("iterer dir ")) {
            var dir = cmd[2]
            var dist_min = cmd[3]

            var pos = getenv(cmd[1])
            if (pos == null) {
                console.log("ERREUR : itération impossible, étiquette non définie : ",cmd[1])
                return
            }

            var tdist = chercher_dist(distances,dir)
            console.log("dist trouvée = "+tdist[1])
            if (cmd[0] == "iterer dir >") {
                if ((tdist != null) && (tdist[1] >= dist_min)) {
                    num = env[pos].pos // on itère
                    exec()
                    return
                }
                else {
                    console.log("fin iterer dir >")
                    exec()
                    return
                }
            }
            else if (cmd[0] == "iterer dir <") {
                if ((tdist != null) && (tdist[1] <= dist_min)) {
                    num = env[pos].pos // on itère
                    exec()
                    return
                }
                else {
                    console.log("fin iterer dir <")
                    exec()
                }
            }
            else {
                console.log("ERREUR : syntaxe incorrecte iterer si dist dir : "+JSON.stringify(cmd))
                return
            }
        }
		//---------------FIN DE NOS FONCTIONS-------------------------------
		else if (cmd[0].startsWith("iterer si dist dir ")) {
            var dir = cmd[2]
            var dist_min = cmd[3]

            var pos = getenv(cmd[1])
            if (pos == null) {
                console.log("ERREUR : itération impossible, étiquette non définie : ",cmd[1])
                return
            }

            var tdist = chercher_dist(distances,dir)
            console.log("dist trouvée = "+tdist[1])
            if (cmd[0] == "iterer si dist dir >") {
                if ((tdist != null) && (tdist[1] >= dist_min)) {
                    num = env[pos].pos // on itère
                    exec()
                    return
                }
                else {
                    console.log("fin iterer si dist dir >")
                    exec()
                }
            }
            else if (cmd[0] == "iterer si dist dir <") {
                if ((tdist != null) && (tdist[1] <= dist_min)) {
                    num = env[pos].pos // on itère
                    exec()
                    return
                }
                else {
                    console.log("fin iterer si dist dir <")
                    exec()
                }
            }
            else {
                console.log("ERREUR : syntaxe incorrecte iterer si dist dir : "+JSON.stringify(cmd))
                return
            }

 
        }
        else { // on suppose qu'il s'agit d'une étiquette
            setenv(cmd[0],num,0)
            exec()
        }
    }
    else {
        time = Date.now(); 
        console.log("exec "+cmd)
        usb.write(cmd)
    }
 
}

function get_distances() {
    return distances
}

function setenv(etiq,pos,val) { // ajout d'une nouvelle étiquette et de sa valeur associée dans l'environnement
    for (var i=0 ; i<env.length ; i++) {
        if (env[i].etiq == etiq) { // etiquette déjà définie
            env[i].pos = pos
            env[i].v = val
            return
        }
    }

    env.push({etiq : etiq, pos : pos, v : val})
}

function getenv(etiq) { // recherche de la valeur associée à une étiquette dans l'environnement
    for (var i=0 ; i<env.length ; i++) {
        if (env[i].etiq == etiq) { // etiquette déjà définie
            return i
        }
    }

    return null
}

///////////////////////////////// tests //////////////////////////

// faire avancer le robot
if (0 == 1) setTimeout(() => {
    var l = [
        "[[mga 150][mda 150][t 1000]]",     // on avance
        "[[t 1000]]",                       // on attend l'arrêt du robot
    ]
    exec(l)
}, 5000);

// faire avancer le robot 3 fois
if (0 == 1) setTimeout(() => {
    var l = [
        ["b0"],
        "[[mga 150][mda 150][t 1000]]",     // on avance
        "[[t 1000]]",                       // on attend l'arrêt du robot
        ["iterer", "b0", 3],         // on recommence 3 fois
    ]
    exec(l)
}, 5000);

// avancer tant que la distance au mur est supérieure à 300 mm
if (0 == 1) setTimeout(() => {
    var l = [
        "[[s 90]]", // on prépostionne le servo
        ["b0"],
        "[[mga 150][mda 150][t 1000]]",     // on avance
        "[[t 1000]]",                       // on attend l'arrêt du robot
        "[[dd 90]]",    // on mesure la distance
        ["iterer si dist dir >", "b0", 90, 300],         // on itère tant que la distance est supérieure à 300 mm
    ]
    exec(l)
}, 5000);

// longer le mur en zizaguant (mur à gauche)
if (0 == 1) setTimeout(() => {
	// attention, le réglage des vitesses n'a pas été effectué
	// le robot risque de ne pas tourner
    var l = [

        "[[s 180]]", // on prépositionne le servo

        ["b0"],
        
        ["b1"],
        "[[mga 150][mda 200][t 500]]",
        "[[dd 180]]",
        ["iterer si dist dir >", "b1", 180, 300],
        
        ["b2"],
        "[[mga 200][mda 150][t 500]]",
        "[[dd 180]]",
        ["iterer si dist dir <", "b2", 180, 400],
        
        ["iterer", "b0", 1]
        
        ]
    exec(l)
}, 5000);



if (0 == 1) setTimeout(() => {
	var lcmd = [
				["b0"],
				"[[dd 0]]",
				["ma_dist1"],
				["avancer vitesse vg vd"],
				"[[dd 0]]",
				["ma_dist2"],
				["si distances differentes","b0",1] 
				
			]
	exec(lcmd)
},5000);

if (0 == 1) setTimeout(() => {
	var lcmd = [
				 "[[mga 150][mda 250][t 1000]]"
				
			]
	exec(lcmd)
},5000);





///////////////////////////////// export //////////////////////////


module.exports = {
    exec : exec,
    get_distances : get_distances,
}
