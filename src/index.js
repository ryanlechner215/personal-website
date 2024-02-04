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
const mouseAttractStrength = 20;
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

    // Disables right-click context menus
    window.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });
    // aboutButton.addEventListener("contextmenu", (e) => {
    //     e.preventDefault();
    // });
    // projectsButton.addEventListener("contextmenu", (e) => {
    //     e.preventDefault();
    // });
    // linksButton.addEventListener("contextmenu", (e) => {
    //     e.preventDefault();
    // });
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
            <h1 class="scrollable-element">Welcome</h1>
            <p class="scrollable-element">My name is Ryan Lechner, and I'm
            a graphics-focused software developer. I'm currently looking for work 
            in project-based roles. For more details on my experience and specialties, 
            head on over to the about page</p>
            <div></div>
            <p class="scrollable-element">If you want to play around with
            the particles on this page, click and drag your mouse around</p>
            <p class="scrollable-element">Left-click will attract nearby
            particles, and right-click will repel them</p>
            <div></div>
            <p class="scrollable-element">I will be keeping this webpage
            up-to-date with new projects and current ventures</p>
            <div></div>
            <p class="scrollable-element">Feel free to contact me on my 
            LinkedIn, which can be found in the Links dropdown menu</p>
            <p class="scrollable-element">Have a pleasure exploring!</p>
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
            <img src="./../public/images/prof_pic.JPG" alt="picture of me" class="scrollable-element"/>
            <h1 class="scrollable-element">Ryan</h1>
            <h1 style="margin-top: -6.5vw; margin-left: 2.7vw" class="scrollable-element">Lechner</h1>
            <div></div>
            <p class="scrollable-element">Test text</p>
            <p class="scrollable-element">Test text</p>
            <p class="scrollable-element">Test text</p>
            <p class="scrollable-element">Test text</p>
            <p class="scrollable-element">Test text</p>
            <p class="scrollable-element">Test text</p>
            <p class="scrollable-element">Test text</p>
            <p class="scrollable-element">Test text</p>
            <p class="scrollable-element">Test text</p>
            <p class="scrollable-element">Test text</p>
            <p class="scrollable-element">Test text</p>
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

// Fades in home screen, enabled buttons once done
//
function transitionToHomeScreen() {
    setTimeout(() => {
        console.log("Transitioning to home screen");
        const container = document.getElementById("main-container");
        scrollableElements = document.querySelectorAll(".scrollable-element");
        handleScroll();
        runParticleSim(numParticles);
        container.style.transition = `ease-in-out 0.${transitionSpeed / 100}s`;
        container.style.opacity = "1";
        container.style.transform = "translateY(0vh)";
        setTimeout(() => {
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
        if (element.classList.length > 1) {
            element.classList.remove(element.classList[1]);
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