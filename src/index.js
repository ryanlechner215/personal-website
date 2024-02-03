"use strict"

var header = document.getElementById('header');
var content = document.getElementById('content');

var baseUrl = window.location.href;
if (baseUrl[baseUrl.length - 1] != "#") baseUrl += "#";
window.history.replaceState({}, "", "#");
window.addEventListener('popstate', displayContent);

class Particle {
    constructor() {

    }
}



function displayContent(state) {
    console.log("Displaying Content...");
    //console.log(window.location.href);
    //console.log(baseUrl);
    if (window.location.href == baseUrl) {
        //console.log("Home screen");
        content.innerHTML = homeScreen();
        runParticleSim(50);
        return;
    } else if (window.location.href == baseUrl + "about") {
        //console.log("About screen");
        content.innerHTML = aboutScreen();
        return;
    } else if (window.location.href == baseUrl + "projects") {
        //console.log("Projects screen");
        content.innerHTML = projectsScreen();
        return;

    }
}

function navigate(branch) {
    if (window.location.href == baseUrl + branch) return;
    else {
        console.log("Navigating...");
        window.history.pushState({}, "", "#" + branch);
    }
    const navEvent = new PopStateEvent('popstate');
    window.dispatchEvent(navEvent);
}

function displayHeader() {
    header.innerHTML = (`
        <div>
            <div class="header-line" style="flex: 0.8"></div>
            <button id="home-button">Home</button>

            <div class="header-line" style="flex: 2"></div>
            <button id="about-button">About</button>

            <div class="header-line" style="flex: 0.6"></div>
            <button id="projects-button">Projects</button>

            <div class="header-line" style="flex: 0.6"></div>
            <button id="links-button">Links</button>

            <div class="header-line" style="flex: 1"></div>
        </div>
        `);
    document.getElementById("home-button").onclick = function() {
        navigate("");
    };
    document.getElementById("about-button").onclick = function() {
        navigate("about");
    };
    document.getElementById("projects-button").onclick = function() {
        navigate("projects");
    };
}

function homeScreen() {
    return (
        `
        <canvas id="particle-sim"></canvas>
        <div class='center-div'>
            <p>Welcome</p>
        </div>
        `
    )
}

function aboutScreen() {
    return (
        `
        <div class='center-div'>
            <img src="./../public/images/prof_pic.JPG" alt="picture of me" />
            <p>Ryan</p>
            <p style="margin-top: 12vw; margin-left: 2.7vw">Lechner</p>
        </div>
        `
    )
}

function projectsScreen() {
    return (
        `
        <div class='center-div'>
            <p>Projects</p>
        </div>
        `
    )
}




function runParticleSim( numParticles ) {

}





displayHeader();
displayContent();