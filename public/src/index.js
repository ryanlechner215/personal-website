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
const mouseAttractStrength = 200;
const mouseRepelStrength = 50;


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
var lastRenderTime = new Date().getTime();



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
window.addEventListener("keyup", (e) => {
    if (e.keyCode == 88) {
        console.log(particles);
    }
});

function handleResize() {
    if (canvas != null) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        width = canvas.width;
        height = canvas.height;
        context.strokeStyle = "rgba(171, 242, 255, 0.868)";
        context.globalCompositeOperation = "lighter";
    }
};
handleResize();

window.addEventListener("resize", handleResize);
window.addEventListener("mousemove", (e) => {
    mouse.pos = new Pt3d(e.x, e.y, 1);
    mouse.vec = new Vec2d(e.movementX, e.movementY);
});
content.addEventListener("mousedown", (e) => {
    if (e.button == 0) {
        mouse.left = true;
    } else if (e.button == 1) {
        mouse.middle = true;
    } else if (e.button == 2) {
        mouse.right = true;
    }
});
content.addEventListener("mouseup", (e) => {
    if (e.button == 0) {
        mouse.left = false;
    } else if (e.button == 1) {
        mouse.middle = false;
    } else if (e.button == 2) {
        mouse.right = false;
    }
});
content.addEventListener("mouseout", () => {
    mouse.left = false;
    mouse.middle = false;
    mouse.right = false;
});



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
        if (this.pos.y > height + despawnDist) {
            return this.despawn();
        }
        if (this.pos.y == NaN || this.pos.x == NaN || this.vel.x == NaN || this.vel.y == NaN) {
            return this.despawn(true);
        }
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
        if (state == "about") {
            state = "transitioning";
            transitionOffAboutScreen();
            setTimeout(() => {
                window.scrollTo(0,0);
                content.innerHTML = homeScreen();
                transitionToHomeScreen();
            }, transitionSpeed + 10);
        } else if (state == "projects") {
            state = "transitioning";
            transitionOffProjectsScreen();
            setTimeout(() => {
                window.scrollTo(0,0);
                content.innerHTML = homeScreen();
                transitionToHomeScreen();
            }, transitionSpeed + 10);
        } else if (state == "links") {
            state = "transitioning";
            transitionOffLinksScreen();
            setTimeout(() => {
                window.scrollTo(0,0);
                content.innerHTML = homeScreen();
                transitionToHomeScreen();
            }, transitionSpeed + 10);
        } else {
            state = "transitioning";
            content.innerHTML = homeScreen();
            transitionToHomeScreen();
        }
    } else if (window.location.href == baseUrl + "about") {
        //console.log("About screen");
        if (state == "simulating") {
            state = "transitioning";
            transitionOffHomeScreen();
            despawnParticles(function() {
                state = "transitioning";
                window.scrollTo(0,0);
                content.innerHTML = aboutScreen();
                transitionToAboutScreen();
            });
        } else if (state == "projects") {
            state = "transitioning";
            transitionOffProjectsScreen();
            setTimeout(() => {
                window.scrollTo(0,0);
                content.innerHTML = aboutScreen();
                transitionToAboutScreen();
            }, transitionSpeed + 10);
        } else if (state == "links") {
            state = "transitioning";
            transitionOffLinksScreen();
            setTimeout(() => {
                window.scrollTo(0,0);
                content.innerHTML = aboutScreen();
                transitionToAboutScreen();
            }, transitionSpeed + 10);
        } else {
            state = "transitioning";
            content.innerHTML = aboutScreen();
            transitionToAboutScreen();
        }
    } else if (window.location.href == baseUrl + "projects") {
        //console.log("Projects screen");
        if (state == "simulating") {
            state = "transitioning";
            transitionOffHomeScreen();
            despawnParticles(function() {
                state = "transitioning";
                window.scrollTo(0,0);
                content.innerHTML = projectsScreen();
                transitionToProjectsScreen();
            });
        } else if (state == "about") {
            state = "transitioning";
            transitionOffAboutScreen();
            setTimeout(() => {
                window.scrollTo(0,0);
                content.innerHTML = projectsScreen();
                transitionToProjectsScreen();
            }, transitionSpeed + 10);
        } else if (state == "links") {
            state = "transitioning";
            transitionOffLinksScreen();
            setTimeout(() => {
                window.scrollTo(0,0);
                content.innerHTML = projectsScreen();
                transitionToProjectsScreen();
            }, transitionSpeed + 10);
        } else {
            state = "transitioning";
            content.innerHTML = projectsScreen();
            transitionToProjectsScreen();
        }
    } else if (window.location.href == baseUrl + "links") {
        //console.log("Links screen");
        if (state == "simulating") {
            state = "transitioning";
            transitionOffHomeScreen();
            despawnParticles(function() {
                state = "transitioning";
                window.scrollTo(0,0);
                content.innerHTML = linksScreen();
                transitionToLinksScreen();
            });
        } else if (state == "about") {
            state = "transitioning";
            transitionOffAboutScreen();
            setTimeout(() => {
                window.scrollTo(0,0);
                content.innerHTML = linksScreen();
                transitionToLinksScreen();
            }, transitionSpeed + 10);
        } else if (state == "projects") {
            state = "transitioning";
            transitionOffProjectsScreen();
            setTimeout(() => {
                window.scrollTo(0,0);
                content.innerHTML = linksScreen();
                transitionToLinksScreen();
            }, transitionSpeed + 10);
        } else {
            state = "transitioning";
            content.innerHTML = linksScreen();
            transitionToLinksScreen();
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

        <div class="header-line" style="flex: 3"></div>
        <button id="about-button">About</button>

        <div class="header-line" style="flex: 0.6"></div>
        <button id="projects-button">Projects</button>

        <div class="header-line" style="flex: 0.6"></div>
        <button id="links-button">Links</button>

        <div class="header-line" style="flex: 0.1"></div>
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
        if (state != "transitioning" && state != "despawning") {
            navigate("links");
        }
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
            <div class="spacer"></div>
            <div class="spacer"></div>
            <div class="spacer"></div>
            <h1 class="scrollable-element blur">Welcome</h1>
                <p class="scrollable-element blur">My name is Ryan Lechner, and I'm
                    an AI-focused software developer. I'm currently looking 
                    for work in project-based roles where I can learn from industry professionals. 
                    For more details on my experience and specialties, 
                    head to the <u id="about-link" style="background-color: #00000000; font-weight: bold; pointer-events: all">about page.</u></p>
            <div class="spacer"></div>
            <p class="scrollable-element blur">If you want to play around with
                the particles on this page, click and drag your mouse around.</p>
            <p class="scrollable-element blur"><b>Left-click will attract</b> nearby
                particles, and <b>right-click will repel</b> them.</p>
            <div class="spacer"></div>
            <p class="scrollable-element blur">I will be keeping this webpage
                up-to-date with new projects and current ventures.</p>
            <div class="spacer"></div>
            <p class="scrollable-element blur">Feel free to contact me on my 
                <a style="font-weight: bold" href="https://www.linkedin.com/in/ryan-lechner2/" target="_blank" rel="noopener noreferrer">LinkedIn</a>, 
                which can be found in the Links page as well.</p>
            <div class="spacer"></div>
            <div class="spacer"></div>
            <div class="spacer"></div>
            <div class="spacer"></div>
            <div class="spacer"></div>
            <div class="spacer"></div>
            <div class="spacer"></div>
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
            <img src="./images/prof_pic.JPG" alt="picture of me" class="scrollable-element"/>
            <h1 class="scrollable-element">Ryan</h1>
            <h1 style="margin-top: -6.5vw; margin-left: 2.7vw" class="scrollable-element">Lechner</h1>
            <div class="spacer"></div>

            <h3 class="scrollable-element">Hi there!</h3>
            <p class="scrollable-element">As is written on the main page, 
                <u>I'm a software developer focused on artificial intelligence</u>. 
                I'm currently in my final year at 
                Purdue University, and I will be graduating this May with a major 
                in <b>computer science</b> and a minor in English. I'm looking for 
                a <u>project-facing role</u>, and want to learn from those who have tread 
                before me as much as possible.</p>
            <div class="spacer"></div>

            <h2 class="scrollable-element">Who I am</h2>
            <p class="scrollable-element">Before getting into the nitty-gritty, 
                I'll touch on who I am. <u>I thrive under pressure</u>. I love it. 
                It usually means there's more to <i>learn</i>.</p>
            <p class="scrollable-element"><b>I like optimizing and polishing</b> anything that 
                I have the time for, I learn quickly, and I spend time outside of 
                work and school learning whenever I can. I have a <i>ton</i> 
                of hobbies and interests, but I'll get more into those at the 
                bottom of this page.</p>
            <div class="spacer"></div>

            <h2 class="scrollable-element">Club president</h2>
            <p class="scrollable-element">I've also been lucky enough to be 
                the <u>president of the roundnet (Spikeball) club</u> here at Purdue.</p>
            <p class="scrollable-element"><b>During my presidency, 
                we've grown from 300 to over 800 members</b>. We've hosted 
                5 tournaments and run 3 other events while I have been on the 
                executive team. I also compete around the mid-west, which 
                has been an amazing travel opportunity for me.</p>
            <div class="spacer"></div>

            <h2 class="scrollable-element">Fields of interest</h2>
            <p class="scrollable-element">I plan to focus on <u>AI and machine 
                learning</u> eventually, but I have a passion for programming in general, 
                especially work requiring <i>in-depth, creative problem 
                solving.</i> So, software development roles are what I'm currently looking for.</p>
            <p class="scrollable-element">I've found that these two interests 
                cross paths in game development, but that doesn't include the 
                whole scope of the field. <b>Physics/game engine development and 
                AI agent creation</b> are where I can apply myself best. I'd 
                like to try my hand at gameplay programming beyond personal 
                games as well, though.</p>
            <div class="spacer"></div>

            <h2 class="scrollable-element">AI work</h2>
            <p class="scrollable-element">I have done a lot of AI stuff. 
                I've made <u>graph-search</u> models, <u>decision-tree</u> algorithms, 
                <u>path-finding</u> agents, and <u>linear-optimization</u> algorithms.
                I've dabbled in <u>classification</u> algorithms, and I've created 
                one <u>neural network</u>.</p>
            <p class="scrollable-element">I also made AIs for enemies in a 
                couple games. An example, that I've linked below, is currently 
                up and running (and is a rather fun, quick, arcade-style game). I've gone 
                into more detail on the projects page, but the snake boss is the 
                AI agent that I'm alluding to, and it spawns at 500 points. For a 
                24-hour sprint to produce for a game jam, I'm rather proud of it.</p>
            <a class="scrollable-element" href="https://main.d1rk2ynogd8lka.amplifyapp.com/" target="_blank" rel="noopener noreferrer">Arcade Game</a>
            <p class="scrollable-element"><br>I'm in the process of making 
                another neural net for an indie game that I'm helping with. The 
                purpose of the net is to train a series of bots. For an idea 
                of the outcome, think of the chess bots implemented by chess.com, 
                albeit with a much smaller training set.</p>
            <a class="scrollable-element" href="https://monstersofthesea.io" target="_blank" rel="noopener noreferrer">Monsters of the Sea</a>
            <div class="spacer"></div>
            <div class="spacer"></div>

            <h2 class="scrollable-element">Graphics experience</h2>
            <p class="scrollable-element">I've made the barebones engines behind a couple  
                indie games, and have created two technical 3d renderers 
                to explore the concepts behind more advanced rendering techniques, 
                such as <u>parallax mapping</u>, <u>different shader mappings</u>, 
                and <u>global illumination</u>.</p>
            <p class="scrollable-element">I've done projects with <u>image processing</u>, 
                <u>procedural terrain generation</u>, and <u>particle simulation</u> (can you tell 
                that I like these ones?). The next project on my list 
                is a fabric simulation. I don't yet know if I have the 
                physics-expertise for it, but I want to learn, nonetheless</p>
            <div class="spacer"></div>

            <h2 class="scrollable-element">Algorithms, generally</h2>
            <p class="scrollable-element">Algorithms is a massive field. The more 
                I learn, the more I realize I don't know. But <b>optimizing programs through 
                clever techniques and data structures will forever be an interest 
                of mine.</b></p>
            <p class="scrollable-element">A very broad overview of what I've 
                studied and implemented: <u>binary/quad/oct trees</u> and their corresponding 
                manipulations, graph searches, linear optimization, <u>dynamic programming</u>, 
                probabilistic algorithm analysis, and some stuff regarding sparse data 
                sets.</p>
            <div class="spacer"></div>

            <h2 class="scrollable-element">I mentioned hobbies...</h2>
            <p class="scrollable-element">Ah-hem. I rock climb, write both poetry 
                and prose, and play Spikeball, volleyball, tennis, and ping pong.</p>
            <p class="scrollable-element">I enjoy home cooking, reading (philosophy, 
                science-fiction, fantasy), video games, and anime. I haven't had 
                much time for the last two in quite a while.</p>
            <p class="scrollable-element">I also work out, take up small 
                side hobbies (like Rubik's cubes and yo-yo'ing), and have a 
                rather sizable collection of board games.</p>
            <div class="spacer"></div>

            <h2 class="scrollable-element">What to look forward to</h2>
            <p class="scrollable-element">I am in the constant cycle of planning 
                and writing my dream novel. I'm working on two startup projects, 
                and I will be writing coding blogs for problems that I've 
                struggled with and had to overcome.</p>
            <p class="scrollable-element">Now, at the end of what has essentially 
                become an essay, I bid you adieu!</p>
            <div class="spacer"></div>
            <div class="spacer"></div>
            <div class="spacer"></div>
            <div class="spacer"></div>
            <div class="spacer"></div>
            <div class="spacer"></div>
            <div class="spacer"></div>
        </div>
        `
    )
}

// Returns projects screen elements
//
function projectsScreen() {
    return (
        `
        <div class="center-div overwrite-pointer-events" id="main-container">
            <div class="spacer"></div>
            <div class="spacer"></div>
            <h1 class="scrollable-element">Projects</h1>
            <p class="scrollable-element" style="margin-top:-3.7vw">These are listed newest-first. Hover over images to 
                play example gifs! (Some projects do not have gifs)</p>
            <div class="spacer"></div>
            <div class="project-unit scrollable-element" style="background-color: rgba(229, 124, 12, 0.675)">
                <div class="spacer2"></div>
                <h2><a href="https://main.d1rk2ynogd8lka.amplifyapp.com/" target="_blank" rel="noopener noreferrer">Arcade Game</a></h2>
                <h3>Arcade-style web game - (Jan. 2024)</h3>
                <div class="description">
                    <div>
                        <img src="./images/chuckle-nuts-pic.png" alt="arcade game pic"></img>
                        <img src="./images/chuckle-nuts-high.gif" class="active" alt="arcade game gif"></img>
                    </div>
                    <p>My contributions to this game-jam game cover most things gameplay-related: 
                        the enemy movement and concepts, collision detection, boss phases, and 
                        spawn mechanics. This was all written in JS, CSS, and HTML, 
                        so if you wish, you can inspect the code at your leisure.</p>
                    <p style="margin-top: 10vw"><i>Additional credits to: Quin Houck, Lucas Klopfenstein</i></p>
                </div>
                <div class="spacer2"></div>
            </div>
            <div class="spacer"></div>
            <div class="project-unit scrollable-element left" style="background-color: rgba(251, 251, 11, 0.524)">
                <div class="spacer2"></div>
                <h2><a href="https://monstersofthesea.io/" target="_blank" rel="noopener noreferrer">Monsters of the Sea</a></h2>
                <h3>Web version of board game - (November 2023 - current)</h3>
                <div class="description">
                    <div>
                        <img src="./images/mots-pic.png" class="left-img" alt="pic of MOTS"></img>
                        <img src="./images/mots-high.gif" class="active left-img" alt="gif of MOTS"></img>
                    </div>
                    <p>Monsters of the Sea was originally a board game, and 
                        we are now making it playable on the web.</p>
                    <p>I am creating a series of bots for the user to play against, which 
                        range from simple decision-tree models to neural-networks. One of 
                        by biggest takeaways so far has been gettings bots to train each 
                        other through simulated games in a semi-reinforcement environment.<p>
                    <p><i>Additional credits to: Quin Houck, Lucas Klopfenstein</i></p>
                </div>
                <div class="spacer2"></div>
            </div>
            <div class="spacer"></div>
            <div class="spacer"></div>
        </div>
        `
    )
}

function linksScreen() {
    return (
        `
        <div class="center-div" id="main-container">
            <div class="spacer"></div>
            <h1 class="scrollable-element">Links</h1>
            <div class="spacer"></div>
            <div class="spacer"></div>
            <div class="links-container scrollable-element">
                <div class="link-icon-pair">
                    <img src="./images/icons/github.png" alt="GitHub icon"></img>
                    <a href="https://github.com/ryanlechner215" target="_blank" rel="noopener noreferrer">GitHub</a>
                    <p>@ryanlechner215</p>
                </div>
                <div class="link-icon-pair">
                    <img src="./images/icons/linkedin.png" alt="LinkedIn icon"></img>
                    <a href="https://www.linkedin.com/in/ryan-lechner2/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                    <p>@ryan-lechner2</p>
                </div>
            </div>
            <div class="spacer"></div>
            <div class="spacer"></div>
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
        const aboutLink = document.getElementById("about-link");
        aboutLink.onclick = function() {
            if (state != "transitioning" && state != "despawning") {
                navigate("about");
            }
        };
        aboutLink.addEventListener("mouseover", () => {
            aboutLink.style.cursor = "pointer";
        })
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

// Fades in projects screen, enables buttons once done
//
function transitionToLinksScreen() {
    setTimeout(() => {
        console.log("Transitioning to links screen");
        const container = document.getElementById("main-container");
        scrollableElements = document.querySelectorAll(".scrollable-element");
        handleScroll();
        container.style.transition = `ease-in-out 0.${transitionSpeed / 100}s`;
        container.style.opacity = "1";
        container.style.transform = "translateY(0vh)";
        setTimeout(() => {
            handleScroll();
            container.style.transition = "ease 0.3s";
            state = "links";
        }, transitionSpeed + 10);
    }, 100);
}

// Fades out projects screen, disables buttons
//
function transitionOffLinksScreen() {
    console.log("Transitioning off links screen");
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
        if (element.classList.contains("opacity-0") || element.classList.contains("opacity-10") || element.classList.contains("opacity-25") || element.classList.contains("opacity-50") || element.classList.contains("opacity-75") || element.classList.contains("opacity-100")) {
            element.classList.remove(element.classList[element.classList.length - 1]);
        }

        if (percentFromBottom < .05 || percentFromTop < .10) {
            element.classList.add("opacity-0");
        } else if (percentFromBottom < .12 || percentFromTop < .15) {
            element.classList.add("opacity-10");
        } else if (percentFromBottom < .17 || percentFromTop < .20) {
            element.classList.add("opacity-25");
        } else if (percentFromBottom < .25 || percentFromTop < .25) {
            element.classList.add("opacity-50");
        } else if (percentFromBottom < .30 || percentFromTop < .30) {
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
    const currentTime = new Date().getTime();
    //console.log(currentTime-lastRenderTime);
    setTimeout(() => {
        animFrameId = requestAnimationFrame(renderParticles);
        lastRenderTime = new Date().getTime();
    }, Math.max(16-(currentTime-lastRenderTime), 1));

    context.clearRect(0, 0, width, height);

    particles.forEach((particle) => {
        if (state == "despawning") return;
        if (particle == null || particle.despawned == true) {
            var idx = particles.indexOf(particle);
            //console.log(idx + " needs replacing")
            particles.splice(idx, 1, new Particle())
        }
    });

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