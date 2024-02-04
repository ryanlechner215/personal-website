"use strict"



//! Begin global variables

// Parameters
const gravStrength = 1;
const numParticles = 300;
const dampeningFactor = 0.5;
const particleMass = 2.5;
const repelDist = 570;
const minDist = 0.01;
const particleRadius = 7;
const boundStrength = 200;
const despawnDist = 50;
const transitionSpeed = 800;
const mouseAttractStrength = 50;
const mouseRepelStrength = 20;


// Program-only variables
var header = document.getElementById('header');
var content = document.getElementById('content');
var particles = [];
var canvas = null;
var context = null;
var state = "loading";
var width = 0;
var height = 0;
var animFrameId = -1;
var numDespawned = 0;
var homeTransitionDone = false;
var scrollableElements = [];
var scrolling = false;
var mouse = {
    pos: null,
    vec: null,
    left: false,
    middle: false,
    right: false
};
var numClasses = 1;



//! Begin window initialization

// URL manipulation to work with local and hosted paths
// AKA hashing, I think.
// Handles refreshes, direct links to non-landing pages,
// and initial loads of the site.
//
var baseUrl = window.location.href.split("#")[0] + "#";
if (window.location.href.split("#").length == 1) {
    window.history.replaceState({}, "", "#");
}
window.addEventListener("popstate", displayContent);
window.addEventListener("scroll", handleScroll);

function handleResize() {
    if (canvas != null) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        width = canvas.width;
        height = canvas.height;
        context.strokeStyle = "rgba(171, 242, 255, 0.868)";
        context.globalCompositeOperation = "lighter";
    }
    handleScroll();
};
handleResize();

window.addEventListener("resize", handleResize);
window.addEventListener("mousemove", (e) => {
    mouse.pos = new Pt3d(e.x, e.y, 1);
    mouse.vec = new Vec2d(e.movementX, e.movementY);
});
window.addEventListener("mousedown", (e) => {
    if (e.button == 0) {
        mouse.left = true;
    } else if (e.button == 1) {
        mouse.middle = true;
    } else if (e.button == 2) {
        mouse.right = true;
    }
});
window.addEventListener("mouseup", (e) => {
    if (e.button == 0) {
        mouse.left = false;
    } else if (e.button == 1) {
        mouse.middle = false;
    } else if (e.button == 2) {
        mouse.right = false;
    }
})



//! Begin utility functions

// Returns random number between floor and ceiling
function randomNum(floor, ceiling) {
    return Math.random() * (ceiling - floor) + floor;
}

// Returns random int between floor and ceiling
function randomInt(floor, ceiling) {
    if ( ceiling < floor ) return 0;
    return Math.floor(randomNum(floor, ceiling));
}



//! Begin classes

class Pt3d {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    eucDist(pt) {
        return Math.sqrt( Math.pow( this.x/this.z - pt.x/pt.z, 2 ) + Math.pow( this.y/this.z - pt.y/pt.z, 2 ) );
    }

    vecTo(pt) {
        return new Vec2d(pt.x - this.x, pt.y - this.y, 1);
    }

    add(vec) {
        this.x += vec.x;
        this.y += vec.y;
    }
}

class Vec2d {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(vec) {
        this.x += vec.x;
        this.y += vec.y;
    }

    dot(vec) {
        return this.x*vec.x + this.y*vec.y;
    }

    divBy(num) {
        return new Vec2d(this.x/num, this.y/num);
    }

    mulBy(num) {
        return new Vec2d(this.x*num, this.y*num);
    }

    magnitude() {
        return Math.sqrt(Math.pow(this.x, 2)+Math.pow(this.y, 2));
    }

    normalizedTo(num) {
        const mag = this.magnitude();
        return new Vec2d(num*this.x/mag, num*this.y/mag);
    }
}

//! More global variables
var gravVec = new Vec2d(0, 0.1).divBy(1 / gravStrength);
var leftBoundVec = new Vec2d(boundStrength, 0);
var rightBoundVec = new Vec2d(-boundStrength, 0);
var bottomBoundVec = new Vec2d(0, -boundStrength);


// Particles initialize to a random spot on screen
//
class Particle {
    constructor() {
        this.pos = new Pt3d(randomInt(1, width - 1), randomInt(-2*height, -height), 1);
        this.vel = new Vec2d(0, 0);
        this.despawned = false;

        this.closest = null;
        this.closestDist = width*2;
        this.vecToClosest = null;
        this.closest2 = null;
        this.closestDist2 = width*2;
        this.vecToClosest2 = null;
        this.closest3 = null;
        this.closestDist3 = width*2;
        this.vecToClosest3 = null;
    }

    repel(dist, vec) {
        this.vel.add(vec.divBy(Math.max(particleMass*Math.pow(dist, 2), minDist)));
    }

    despawn() {
        if (!this.despawned) {
            this.despawned = true;
            numDespawned++;
        }
    }

    update() {
        if (this.pos.y > height + despawnDist) return this.despawn();
        this.closest = null;
        this.vecToClosest = null;
        this.closestDist = width*2;
        particles.forEach((particle) => {
            if ( this != particle && !particle.despawned ) {
                const distToParticle = particle.pos.eucDist(this.pos);
                const vecFromParticle = particle.pos.vecTo(this.pos);
                if (distToParticle < this.closestDist) {
                    this.closest3 = this.closest2;
                    this.closestDist3 = this.closestDist2;
                    this.vecToClosest3 = this.vecToClosest2;
                    
                    this.closest2 = this.closest;
                    this.closestDist2 = this.closestDist;
                    this.vecToClosest2 = this.vecToClosest;

                    this.closest = particle;
                    this.closestDist = distToParticle;
                    this.vecToClosest = vecFromParticle.normalizedTo(-particleRadius);
                } else if (distToParticle < this.closestDist2) {
                    this.closest3 = this.closest2;
                    this.closestDist3 = this.closestDist2;
                    this.vecToClosest3 = this.vecToClosest2;

                    this.closest2 = particle;
                    this.closestDist2 = distToParticle;
                    this.vecToClosest2 = vecFromParticle.normalizedTo(-particleRadius);
                } else if (distToParticle < this.closestDist3) {
                    this.closest3 = particle;
                    this.closestDist3 = distToParticle;
                    this.vecToClosest3 = vecFromParticle.normalizedTo(-particleRadius);
                }

                if (distToParticle < repelDist) {
                    this.repel(distToParticle, vecFromParticle);
                }
            }
        })
        this.vel.add(gravVec);
        this.checkBounds();
        this.mouseInteract();

        this.pos.add(this.vel);
    }

    mouseInteract() {
        if (mouse.pos == null || mouse.vec == null || (mouse.left && mouse.right)) return;
        else if (mouse.left) {
            const distToMouse = mouse.pos.eucDist(this.pos);
            const vecToMouse = this.pos.vecTo(mouse.pos);
            this.repel(distToMouse, vecToMouse.mulBy(mouseAttractStrength));
        } else if (mouse.right) {
            const distToMouse = mouse.pos.eucDist(this.pos);
            const vecFromMouse = mouse.pos.vecTo(this.pos);
            this.repel(distToMouse, vecFromMouse.mulBy(mouseRepelStrength));
        }
    }

    checkBounds() {
        if (this.pos.y > height - repelDist && state == "simulating") {
            if (this.pos.y > height - particleRadius) {
                this.pos.y = height - particleRadius;
                //console.log("fixing");
                //this.vel.y = -dampeningFactor*this.vel.y;
            }
            this.repel(Math.max(height-this.pos.y, minDist), bottomBoundVec);
        }


        if (this.pos.x < repelDist) {
            if (this.pos.x < particleRadius) {
                this.pos.x = particleRadius;
                this.vel.x = -dampeningFactor*this.vel.x;
            }
            this.repel(this.pos.x, leftBoundVec);
        } else if (this.pos.x > width - repelDist) {
            if (this.pos.x > width - particleRadius) {
                this.pos.x = width - particleRadius;
                this.vel.x = -dampeningFactor*this.vel.x;
            }
            this.repel(width - this.pos.x, rightBoundVec);
        }
    }

    render(context) {
        if (this.despawned) return;

        this.update();
        context.strokeStyle = "rgba(171, 242, 255, 1)";
        context.beginPath();
        context.moveTo(this.pos.x + particleRadius, this.pos.y);
        context.arc(this.pos.x, this.pos.y, particleRadius, Math.PI * 2, false);
        context.stroke();

        context.strokeStyle = "rgba(171, 242, 255, 0.2)";
        context.beginPath();

        if (this.closest != null) {
            context.moveTo(this.pos.x + this.vecToClosest.x, this.pos.y + this.vecToClosest.y);
            context.lineTo(this.closest.pos.x - this.vecToClosest.x, this.closest.pos.y - this.vecToClosest.y);
        }
        if (this.closest2 != null) {
            context.moveTo(this.pos.x + this.vecToClosest2.x, this.pos.y + this.vecToClosest2.y);
            context.lineTo(this.closest2.pos.x - this.vecToClosest2.x, this.closest2.pos.y - this.vecToClosest2.y);
        }
        if (this.closest3 != null) {
            context.moveTo(this.pos.x + this.vecToClosest3.x, this.pos.y + this.vecToClosest3.y);
            context.lineTo(this.closest3.pos.x - this.vecToClosest3.x, this.closest3.pos.y - this.vecToClosest3.y);
        }
        context.stroke();
    }
}


function despawnParticles(endFunc) {
    //console.log("Waiting for full despawn...");
    //console.log(numDespawned);
    //console.log(numParticles);

    state = "despawning";
    if (numDespawned == numParticles && homeTransitionDone) {
        homeTransitionDone = false;
        window.cancelAnimationFrame(animFrameId);
        animFrameId = -1;
        particles = [];
        numDespawned = 0;
        endFunc();
    } else {
        setTimeout(() => {despawnParticles(endFunc)}, 100)
    };
}



//! Begin faux page navigation functions

// Re-structures DOM for the current URL
// Works like a router
//
function displayContent() {
    console.log("Displaying Content...");
    //console.log(window.location.href);
    //console.log(baseUrl);

    // Checks URL against target URLs
    if (window.location.href == baseUrl) {
        //console.log("Home screen");
        numClasses = 2;
        if (state == "about") {
            state = "transitioning";
            transitionOffAboutScreen();
            setTimeout(() => {
                content.innerHTML = homeScreen();
                transitionToHomeScreen();
            }, transitionSpeed + 10);
        } else if (state == "projects") {
            state = "transitioning";
            transitionOffProjectsScreen();
            setTimeout(() => {
                content.innerHTML = homeScreen();
                transitionToHomeScreen();
            }, transitionSpeed + 10);
        } else {
            state = "transitioning";
            content.innerHTML = homeScreen();
            transitionToHomeScreen();
        }
    } else if (window.location.href == baseUrl + "about") {
        numClasses = 1;
        //console.log("About screen");
        if (state == "simulating") {
            state = "transitioning";
            transitionOffHomeScreen();
            despawnParticles(function() {
                state = "transitioning";
                content.innerHTML = aboutScreen();
                transitionToAboutScreen();
            });
        }else if (state == "projects") {
            state = "transitioning";
            transitionOffProjectsScreen();
            setTimeout(() => {
                content.innerHTML = aboutScreen();
                transitionToAboutScreen();
            }, transitionSpeed + 10);
        } else {
            state = "transitioning";
            content.innerHTML = aboutScreen();
            transitionToAboutScreen();
        }
    } else if (window.location.href == baseUrl + "projects") {
        numClasses = 1;
        //console.log("Projects screen");
        if (state == "simulating") {
            state = "transitioning";
            transitionOffHomeScreen();
            despawnParticles(function() {
                state = "transitioning";
                content.innerHTML = projectsScreen();
                transitionToProjectsScreen();
            });
        } else if (state == "about") {
            state = "transitioning";
            transitionOffAboutScreen();
            setTimeout(() => {
                content.innerHTML = projectsScreen();
                transitionToProjectsScreen();
            }, transitionSpeed + 10);
        } else {
            state = "transitioning";
            content.innerHTML = projectsScreen();
            transitionToProjectsScreen();
        }
    }
}

// Changes URL and sends event
//
function navigate(branch) {
    // Does nothing if already on target page
    if (window.location.href == baseUrl + branch) return;
    else {
        console.log("Navigating...");
        
        // Adds a state for back and forward-buttoning
        // Changes URL for optional display purposes
        window.history.pushState({}, "", "#" + branch);
    }
    // Sends a navigation event to be caught
    const navEvent = new PopStateEvent('popstate');
    window.dispatchEvent(navEvent);
}



//! Begin DOM component functions

// Sets header elements in DOM
//
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
    
    // Gets button elements from DOM
    var homeButton = document.getElementById("home-button");
    var projectsButton = document.getElementById("projects-button");
    var aboutButton = document.getElementById("about-button");
    var linksButton = document.getElementById("links-button");

    // Adds functionality to buttons
    homeButton.onclick = function() {
        if (state != "transitioning" && state != "despawning") {
            navigate("");
        }
    };
    aboutButton.onclick = function() {
        if (state != "transitioning" && state != "despawning") {
            navigate("about");
        }
    };
    projectsButton.onclick = function() {
        if (state != "transitioning" && state != "despawning") {
            navigate("projects");
        }
    };
    linksButton.onclick = function() {
        dropDownLinks();
    };

    homeButton.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });
    aboutButton.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });
    projectsButton.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });
    linksButton.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });
}

//! Begin DOM component functions

// Returns home screen elements
//
function homeScreen() {
    return (
        `
        <canvas id="particle-sim" class="particle-sim"></canvas>
        <div class="center-div" id="main-container">
            <div></div>
            <div></div>
            <div></div>
            <h1 class="scrollable-element blur">Welcome</h1>
            <p class="scrollable-element blur"><b>My name is Ryan Lechner</b>, and <u>I'm
                a graphics and AI-focused software developer</u>. I'm currently looking for work 
                in project-based roles. For more details on my experience and specialties, 
                head on over to the about page.</p>
            <div></div>
            <p class="scrollable-element blur">If you want to play around with
                the particles on this page, click and drag your mouse around.</p>
            <p class="scrollable-element blur"><b>Left-click will attract</b> nearby
                particles, and <b>right-click will repel</b> them.</p>
            <div></div>
            <p class="scrollable-element blur">I will be keeping this webpage
                up-to-date with new projects and current ventures.</p>
            <div></div>
            <p class="scrollable-element blur">Feel free to contact me on my 
                LinkedIn, which can be found in the Links dropdown menu.</p>
            <p class="scrollable-element blur">Have a pleasure exploring!</p>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </div>
        `
    )
}

// Returns about screen elements
//
function aboutScreen() {
    return (
        `
        <div class="center-div" id="main-container">
            <img src="./../images/prof_pic.JPG" alt="picture of me" class="scrollable-element"/>
            <h1 class="scrollable-element">Ryan</h1>
            <h1 style="margin-top: -6.5vw; margin-left: 2.7vw" class="scrollable-element">Lechner</h1>
            <div></div>
            <h3 class="scrollable-element">Hi there!</h3>
            <p class="scrollable-element">As is written on the main page, 
                I'm a <u>software developer</u>. I'm currently in my final year at 
                Purdue University, and I will be graduating this May with a major 
                in <b>computer science</b> and a minor in English. I'm 
                looking for employment at an <u>intermediate to advanced</u> level.</p>
            <div></div>
            <h2 class="scrollable-element">Who I am</h2>
            <p class="scrollable-element">Before getting into the nitty-gritty, 
                I'll touch on who I am. <u>I thrive under pressure</u>. I love it. 
                Whenever I am presented with a challenging problem, I get excited 
                because, the more challenging a problem, the more I <i>learn!</i></p>
            <p class="scrollable-element">I like <b>optimizing and polishing</b> anything that 
                I have the time for, I learn extremely quickly, and, while it's 
                not my first choice, I am a very capable leader. I have a <i>ton</i> 
                of hobbies and interests, but I'll get more into those at the 
                bottom of this page.</p>
            <div></div>
            <h2 class="scrollable-element">Club president</h2>
            <p class="scrollable-element">I've also been lucky enough to be 
                the <u>president of the roundet (Spikeball) club</u> here at Purdue!</p>
            <p class="scrollable-element">During my presidency, 
                <b>we've grown from 300 to over 800</b> members. We've hosted 
                5 tournaments and ran 3 other events while I have been on the 
                executive team. I also compete around the mid-west, which 
                has been an amazing travel opportunity for me.</p>
            <div></div>
            <h2 class="scrollable-element">Fields of interest</h2>
            <p class="scrollable-element">While I would like to focus on 
                <u>graphics and AI</u>, I have a passion for most programming work, 
                especially work requiring <i>in-depth, creative problem 
                solving.</i></p>
            <p class="scrollable-element">I've found that these two interests 
                cross paths in game development, but that doesn't include the 
                whole scope of the field. <b>Physics/game engine development</b> and 
                <b>agent AI creation</b> are where I can apply myself best.</p>
            <div></div>
            <h2 class="scrollable-element">AI work</h2>
            <p class="scrollable-element">I have done a lot of AI stuff. 
                I've made <u>graph-search</u> models, <u>decision-tree</u> algorithms, 
                <u>path-finding</u> agents, and <u>linear-optimization</u> algorithms.
                I've dabbled in <u>classification</u> algorithms, and I've created 
                one <u>neural network</u>.</p>
            <p class="scrollable-element">I also made AIs for enemies in a 
                couple games. An example, that I've linked below, is currently 
                up and running (and is a rather fun, quick, arcade-style game). I've gone 
                into more detail on the projects page, but <b>the snake boss</b> is the 
                AI agent that I'm alluding to, and it spawns at 500 points.
                <br><a href="https://main.d1rk2ynogd8lka.amplifyapp.com/">Chuckle Nuts</a></p>
            <p class="scrollable-element">I'm in the process of making 
                another neural net for an indie game that I'm helping with.
                <br><a href="https://monstersofthesea.io">Monsters of the Sea</a></p>
            <h2 class="scrollable-element">Graphics experience</h2>
            <p class="scrollable-element">I've made the "engines" behind a couple  
                indie games, and have created two technical graphics engines 
                to explore the concepts behind more advanced rendering techniques, 
                such as <u>parallax mapping</u>, <u>different shader mappings</u>, 
                and <u>global illumination</u>.</p>
            <p class="scrollable-element">I've done projects with <u>image processing</u>, 
                <u>procedural terrain generation</u>, and <u>particle simulation</u> (can you tell 
                that I like these ones?). The next project on my list 
                is a fabric simulation. I don't yet know if I have the 
                physics-expertise for it, but I want to learn, nonetheless</p>
            <div></div>
            <h2 class="scrollable-element">I mentioned hobbies...</h2>
            <p class="scrollable-element">Ah-hem. I rock climb, write both poetry 
                and prose, and play Spikeball, volleyball, tennis, and ping pong.</p>
            <p class="scrollable-element">I enjoy home cooking, reading (philosophy, 
                science-fiction, fantasy), video games, and anime. I haven't had 
                much time for the last two in quite a while.</p>
            <p class="scrollable-element">I also work out, take up small 
                side hobbies (like Rubik's cubes and yo-yo'ing), and have a 
                rather sizable collection of board games.</p>
            <div></div>
            <h2 class="scrollable-element">What to look forward to</h2>
            <p class="scrollable-element">I am in the constant cycle of planning 
                and writing my dream novel. I'm working on two startup projects, 
                and I will be writing coding blogs for problems that I've 
                struggled with and had to overcome.</p>
            <p class="scrollable-element">By no means do I expect anyone to have read 
                all of that, but, with that all out of the way, I bid you adieu!</p>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </div>
        `
    )
}

// Returns projects screen elements
//
function projectsScreen() {
    return (
        `
        <div class="center-div" id="main-container">
            <h1 class="scrollable-element">Projects</h1>
        </div>
        `
    )
}



//! Begin transition functions

function preventDefaultFunc(e) {
    e.preventDefault();
}

// Fades in home screen, enabled buttons once done
//
function transitionToHomeScreen() {
    setTimeout(() => {
        console.log("Transitioning to home screen");
        const container = document.getElementById("main-container");
        window.addEventListener("contextmenu", preventDefaultFunc);
        scrollableElements = document.querySelectorAll(".scrollable-element");
        handleScroll();
        runParticleSim(numParticles);
        container.style.transition = `ease-in-out 0.${transitionSpeed / 100}s`;
        container.style.opacity = "1";
        container.style.transform = "translateY(0vh)";
        setTimeout(() => {
            handleScroll();
            container.style.transition = "ease 0.3s";
            state = "simulating";
        }, transitionSpeed + 10);
    }, 100);
}

// Fades out home screen, disables buttons
//
function transitionOffHomeScreen() {
    console.log("Transitioning off home screen");
    const container = document.getElementById("main-container");
    container.style.transition = `ease-in-out 0.${transitionSpeed / 100}s 1.${(21 - (transitionSpeed / 100)) % 10}s`;
    container.style.opacity = "0";
    container.style.transform = "translateY(5vh)";
    setTimeout(() => {
        window.removeEventListener("contextmenu", preventDefaultFunc);
        homeTransitionDone = true;
    }, 2100);
}

// Fades in about screen, enables buttons once done
//
function transitionToAboutScreen() {
    setTimeout(() => {
        console.log("Transitioning to about screen");
        const container = document.getElementById("main-container");
        scrollableElements = document.querySelectorAll(".scrollable-element");
        handleScroll();
        container.style.transition = `ease-in-out 0.${transitionSpeed / 100}s`;
        container.style.opacity = "1";
        container.style.transform = "translateY(0vh)";
        setTimeout(() => {
            handleScroll();
            container.style.transition = "ease 0.3s";
            state = "about";
        }, transitionSpeed + 10);
    }, 100);
}

// Fades out about screen, disables buttons
//
function transitionOffAboutScreen() {
    console.log("Transitioning off home screen");
    const container = document.getElementById("main-container");
    container.style.transition = `ease-in-out 0.${transitionSpeed / 100}s`;
    container.style.opacity = "0";
    container.style.transform = "translateY(5vh)";
}

// Fades in projects screen, enables buttons once done
//
function transitionToProjectsScreen() {
    setTimeout(() => {
        console.log("Transitioning to projects screen");
        const container = document.getElementById("main-container");
        scrollableElements = document.querySelectorAll(".scrollable-element");
        handleScroll();
        container.style.transition = `ease-in-out 0.${transitionSpeed / 100}s`;
        container.style.opacity = "1";
        container.style.transform = "translateY(0vh)";
        setTimeout(() => {
            handleScroll();
            container.style.transition = "ease 0.3s";
            state = "projects";
        }, transitionSpeed + 10);
    }, 100);
}

// Fades out projects screen, disables buttons
//
function transitionOffProjectsScreen() {
    console.log("Transitioning off projects screen");
    const container = document.getElementById("main-container");
    container.style.transition = `ease-in-out 0.${transitionSpeed / 100}s`;
    container.style.opacity = "0";
    container.style.transform = "translateY(5vh)";
}

// Fades scrollable elements appropriately
//
function handleScroll() {
    for (var i = 0; i < scrollableElements.length; i++) {
        var element = scrollableElements[i];
        var elementRect = element.getBoundingClientRect();
        var percentFromBottom = Math.max(window.innerHeight - elementRect.top, 0)/window.innerHeight;
        var percentFromTop = Math.max(elementRect.bottom, 0)/window.innerHeight;
        //console.log(percentFromBottom);
        if (element.classList.length > numClasses) {
            element.classList.remove(element.classList[numClasses]);
        }

        if (percentFromBottom < .05 || percentFromTop < .15) {
            element.classList.add("opacity-0");
        } else if (percentFromBottom < .10 || percentFromTop < .25) {
            element.classList.add("opacity-10");
        } else if (percentFromBottom < .27 || percentFromTop < .32) {
            element.classList.add("opacity-25");
        } else if (percentFromBottom < .35 || percentFromTop < .37) {
            element.classList.add("opacity-50");
        } else if (percentFromBottom < .45 || percentFromTop < .5) {
            element.classList.add("opacity-75");
        } else {
            element.classList.add("opacity-100");
        }
    }
    //console.log(scrollableElements);
}



//! Begin simulation functions

// Begins the particle sim and render loop
//
function runParticleSim( numParticles ) {
    canvas = document.getElementById("particle-sim");
    context = canvas.getContext("2d");
    handleResize();
    context.strokeStyle = "rgba(171, 242, 255, 0.868)";
    context.fillStyle = "rgba(185, 247, 255, 0)";
    context.save();

    particles = [];
    for (var i = 0; i < numParticles; i++) {
        particles.push(new Particle());
    }
    renderParticles();
}

function renderParticles() {
    //console.log(particles);
    animFrameId = requestAnimationFrame(renderParticles);

    context.clearRect(0, 0, width, height);

    particles.forEach((particle) => {
        particle.update();
        particle.render(context);
    })

    
}



//! Begin on-load functions

// Sets DOM of the website
//
displayHeader();
displayContent();