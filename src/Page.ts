import * as Constants from './Constants';
import Field from './Field';
import Helpers from './Helpers';
import INetworkState from './INetworkState';
import ServerConnection from './ServerConnection';

/** Stores state and resources associated with the browser page */
export default class Page implements INetworkState {
    /** The currently active Page in the browser */
    public static current: Page = new Page();

    // canvas DOM element for the page
    public canvas = null;

    // width/height of the effective drawing area (this is normally fixed to 1280x720)
    public width = 0;
    public height = 0;

    // multipliers to scale the drawing area to the full dimensions of the canvas (updated on window resize)
    public scaleX = 1;
    public scaleY = 1;

    // timestamp of the last time of a frame was drawn (milliseconds)
    public lastFrameTime = 0;

    // time accumulated (seconds) since the last step (game/physics update) was performed
    // when this hits Constants.stepTime, we decrement and do physics updates until its exhausted
    public stepTime = 0;

    // time since the game was started (seconds)
    public elapsedTime = 0;

    // time multiplier applied to Field physics updates (1 is normal speed)
    public timeMultiply = 1;

    // stores the state of keys, if they're pressed and for how long
    // maps KeyCode to state object
    public keyState = {};

    // collection of Fields that are being updated/renderered, normally there's just one, but there could be more
    // to enable multiplayer
    public fields = [];

    // the current Field that the player is controlling
    public activeField: Field;

    // the amount of "pauseness", when its 0 the game is unpaused
    public pauseMode = 0;

    // toggles user-controlled pausing
    public userPauseMode = false;

    // animates the pause text scaling effect
    public pauseTextPulse = 0;

    // the current ServerConnection that relays state updates to the server
    public activeConnection: ServerConnection = null;

    // set to true to enable sound effects
    public enableAudio = false;

    // if true then don't try to connect to the server
    public offlineMode = true;

    // Composite image of all the possible cell colors
    public cellStripImage = null;

    // lookup table for each color's X offset within the cell strip image
    public cellStripOffset = [
        224,    // 0:empty
        32,     // 1:red
        192,    // 2:magenta
        96,     // 3:yellow
        160,    // 4:cyan
        0,      // 5:blue
        64,     // 6:orange
        128     // 7:green
    ];

    // background image of the spinny blue space vortex
    public vortexImage = null;

    // spin angle of the background vortex
    public vortexSpin = 0;

    // image used by the star particles in the background
    public starImage = null;

    // collection of star particles
    public stars = [];

    // countsdown the warp background effect (happens on level change), when it reaches 0 the effect is over
    public warpTime = 0;

    // collection of "streak" particles for the warp effect
    public warpStreaks = [];

    // when true, the star particles are pulled into the vortex (center of screen)
    public warpStarGravity = false;

    // when this is set to a string, it gets overlayed on top of the screen
    public statusText = null;

    // Audio channels
    public audioChan = [];

    // Sound effects
    public soundRotate = null;
    public soundHit = null;
    public soundClear = null;
    public soundShift = null;
    public soundWarp = null;
    public soundGameOver = null;
    public soundPause = null;

    constructor() {
        if (document.readyState === 'complete') {
            this._initialize();
        } else {
            window.addEventListener('load', () => this._initialize());
        }
    }

    /** Starts playing the warp animation (happens on level change) */
    public startWarpEffect() {
        this.warpTime = Constants.WARP_TIME;
        this.warpStarGravity = true;
        this.warpStreaks = [];

        // initialize the collection of streak particles
        for (let i = 0; i < Constants.STREAK_COUNT; i++) {
            let angle = Helpers.Math.getRand(0, 2 * Math.PI);
            let dx = Math.cos(angle);
            let dy = Math.sin(angle);
            let newStreak = {
                x: 0,
                y: 0,
                dx: dx,
                dy: dy,
                speed: Helpers.Math.getRand(1, 4),
            };
            let displacement = Helpers.Math.getRand(1, 64);
            newStreak.x += newStreak.dx * displacement;
            newStreak.y += newStreak.dy * displacement;
            this.warpStreaks.push(newStreak);
        }

        Helpers.Audio.playSound(this.soundWarp);
    }

    /** Draws the vortex and star effects, upon level transition a specific space warp animation runs and is drawn here */
    private _drawBackground(ctx: CanvasRenderingContext2D, step: number) {
        ctx.save();

        // clear the whole drawing area to a solid color
        ctx.fillStyle = Constants.BACKGROUND_COLOR;
        ctx.fillRect(0, 0, this.width, this.height);

        // set origin to the center of the drawing area
        ctx.translate(this.width / 2, this.height / 2);

        // normalize the warp time animation from 0 to 1 (animation is finished when it hits 1)
        let warpTimeNormalized = 1 - (this.warpTime / Constants.WARP_TIME);

        // calculate the size of the background effect (the smallest of the two dimensions that make up the drawing area)
        let minDim = Math.min(this.width, this.height);

        if ((this.warpTime > 0) && (warpTimeNormalized < 0.9)) {
            // the last 10% of the warp animation will scale down the background, which creates an impression that we're flying away from it
            minDim *= 1 - warpTimeNormalized;
        }

        // if the vortex image was loaded from the server, scale and rotate it, then draw
        if (this.vortexImage) {
            ctx.save();
            ctx.scale(minDim / 512, minDim / 512);
            ctx.rotate(this.vortexSpin)
            ctx.drawImage(this.vortexImage, -256, -256);
            ctx.restore();
        }

        // if star image was loaded from the server, draw the star particles
        if (this.starImage) {
            for (let i = 0, len = this.stars.length; i < len; i++) {
                let star = this.stars[i];
                ctx.save();
                ctx.rotate(this.vortexSpin);
                ctx.translate(star.x, star.y);
                ctx.scale(star.scale, star.scale);

                let lifeLeft = Constants.STAR_LIFESPAN - star.life;
                if (star.life < Constants.STAR_FADE_TIME) {
                    // fades the star in at the beginning of its life
                    ctx.globalAlpha = star.life / Constants.STAR_FADE_TIME;
                }
                if (lifeLeft < Constants.STAR_FADE_TIME) {
                    // fades the star out at the end of its life
                    ctx.globalAlpha = lifeLeft / Constants.STAR_FADE_TIME;
                }

                // offset image by its dimension so its centered properly
                ctx.drawImage(this.starImage, -32, -32);

                ctx.restore();

                if (this.warpStarGravity) {
                    // if gravity is turned on, suck the stars toward the center of the screen
                    star.x -= star.x * step;
                    star.y -= star.y * step;
                }
                else {
                    // apply star velocity by multiplying its direction vector by its speed times the current physics step
                    star.x += star.dx * Constants.STAR_SPEED * step * star.speed;
                    star.y += star.dy * Constants.STAR_SPEED * step * star.speed;
                }
                star.life += step * star.speed;

                // if star is dead, spawn a center star at the center
                if (star.life > Constants.STAR_LIFESPAN) {
                    let angle = Helpers.Math.getRand(0, 2 * Math.PI);
                    star.x = 0;
                    star.y = 0;
                    star.scale = Helpers.Math.getRand(0.1, 0.5); // random size
                    star.dx = Math.cos(angle); // direction vector X component
                    star.dy = Math.sin(angle); // direction vector Y component
                    star.life = 0;
                }
            }
        }

        // if this is non-zero, the warp animation is running
        if (this.warpTime > 0) {
            // define a radial gradient that is used to color the streak particles
            let streakGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 512);
            streakGradient.addColorStop(0, "rgb(3, 9, 255)");
            streakGradient.addColorStop(0.5, "rgb(64, 255, 255)");
            streakGradient.addColorStop(1, "rgb(3, 9, 255)");

            // draw streak particles during the first 90% of the animation time
            if (warpTimeNormalized < 0.9) {
                for (let i = 0, len = this.warpStreaks.length; i < len; i++) {
                    let streak = this.warpStreaks[i];

                    // as animation runs, the length of the streaks increase by some arbitary factor
                    let length = (800 * warpTimeNormalized);

                    ctx.save();

                    // for first 25% of the animation, fade in the streak particles
                    if (warpTimeNormalized < 0.25) {
                        ctx.globalAlpha = warpTimeNormalized * 4;
                    }

                    // render the streak particles as lines along their direction vector
                    ctx.strokeStyle = streakGradient;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(streak.x, streak.y);
                    ctx.lineTo(streak.x + streak.dx * length, streak.y + streak.dy * length);
                    ctx.stroke();
                    ctx.restore();

                    // move the streaks out from the center of the screen at their respective speeds
                    streak.x += streak.dx * step * (streak.speed * 200 * (0.4 - warpTimeNormalized));
                    streak.y += streak.dy * step * (streak.speed * 200 * (0.4 - warpTimeNormalized));

                    // if streak gets too far from the center, it wraps back to the center of the screen
                    if ((Math.abs(streak.x) > this.width / 2) || (Math.abs(streak.y) > this.height / 2)) {
                        streak.x = 0;
                        streak.y = 0;
                    }
                }
            }

            // for the last 70% of the warp animation, start fading the background to a white flash, then at 90% finished start fading back in
            if (warpTimeNormalized > 0.3) {
                ctx.save();
                if (warpTimeNormalized < 0.9) {
                    // slowly fade the background to white, it reaches
                    ctx.globalAlpha = Math.min((warpTimeNormalized - 0.3) * 1.9, 1.0);
                }
                else {
                    // turn off the star particle gravity effect
                    if (this.warpStarGravity) {
                        // reset stars back to normal locations so they're not clumped together
                        this._resetStars();
                        this.warpStarGravity = false;
                    }

                    // animate fading back in for the last 10% of the warp animation
                    ctx.globalAlpha = (1 - warpTimeNormalized) * 10;
                }

                // render the white fade-out effect
                ctx.fillStyle = Constants.WHITE_FADER_COLOR;
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.restore();
            }

            // animation time is counting down to 0
            this.warpTime -= step;
        };

        ctx.restore();

        // adjust vortex spin rate during the warp animatino
        let spinSpeed = 0.05;
        if ((this.warpTime > 0) && (warpTimeNormalized < 0.9)) {
            spinSpeed = 0.1 + warpTimeNormalized * 0.4;
        }

        this.vortexSpin += step * spinSpeed;
    }

    /** Called when the browser wants to render a new animation frame for this Page */
    private _drawFrame(frameTime: number) {
        window.requestAnimationFrame(this._drawFrame);

        let ctx = this.canvas.getContext("2d");
        if (!ctx || (typeof frameTime === "undefined")) {
            return;
        }

        // calculate number of seconds elapsed since last frame
        let step = (frameTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = frameTime;

        // run game logic for elapsed time
        this._runGame(step);

        // set to identity matrix
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(this.scaleX, this.scaleY);

        // render the game background effects
        this._drawBackground(ctx, step);

        // if paused, render the pause text
        if (this.pauseMode > 0) {
            ctx.save();
            ctx.font = Constants.PAUSE_FONT;
            let pauseWidth = ctx.measureText("PAUSE").width;
            let textX = this.width / 2 - pauseWidth / 2;
            let textY = this.height / 2 + Constants.PAUSE_FONT_SIZE / 2 - 16;

            let scale = Math.sin(this.pauseTextPulse * 10) * 0.05 + 1;
            this.pauseTextPulse += step;

            ctx.translate(textX + pauseWidth / 2, textY - Constants.PAUSE_FONT_SIZE / 2);
            ctx.scale(scale, scale);
            ctx.translate(-pauseWidth / 2, Constants.PAUSE_FONT_SIZE / 2);

            let gradient = ctx.createLinearGradient(0, -Constants.PAUSE_FONT_SIZE, 0, 0);
            gradient.addColorStop(0, "rgb(255,255,255)");
            gradient.addColorStop(1, "rgb(218,188,8)");
            ctx.fillStyle = gradient;
            ctx.fillText("PAUSE", 0, 0);

            ctx.strokeStyle = "#000";
            ctx.lineWidth = 3;
            ctx.strokeText("PAUSE", 0, 0);

            ctx.restore();
        }
        else {
            // if not paused, render all of the game fields
            for (let i = 0, len = this.fields.length; i < len; i++) {
                let field = this.fields[i];
                field.draw(ctx);
            }
        }

        // render the active field's score boxes
        if (this.activeField) {
            this.activeField.drawScore(ctx);
        }

        // draw any status text overlay
        this._drawStatusText(ctx);
    }

    /** Render text on top of the display */
    private _drawStatusText(ctx: CanvasRenderingContext2D) {
        if (this.statusText) {
            ctx.save();

            ctx.font = "24px Arial";
            let metrics = ctx.measureText(this.statusText);
            let x = Math.floor(this.width / 2 - metrics.width / 2);
            let y = Math.floor(this.height / 2 - 24 / 2);

            ctx.fillStyle = "rgba(0, 32, 64, 0.5)"
            ctx.fillRect(0, y - 30, this.width, 48);

            ctx.fillStyle = "rgb(255, 255, 255)";
            ctx.fillText(this.statusText, x, y);

            ctx.restore();
        }
    }

    /** Browser window got focus */
    private _onFocusIn(e) {
        e = e || window.event;

        this.keyState = {};
    }

    /** Browser window lost focus */
    private _onFocusOut(e) {
        e = e || window.event;

        this.keyState = {};
    }

    /** User started pushing a key */
    private _onKeyDown(e) {
        e = e || window.event;

        // start keeping track of keys that are pressed
        if (!this.keyState[e.keyCode]) {

            this.keyState[e.keyCode] = {
                pressed: true,
                duration: 0,
                repeatStep: 0
            };

            // do any events for the key press
            this._handleKeyPress(e.keyCode);
        }
    }

    private _handleKeyPress(keyCode) {
        switch (keyCode) {
            case 27: // ESC
                this.userPauseMode = !this.userPauseMode;
                this.pauseMode += this.userPauseMode ? 1 : -1;
                Helpers.Audio.playSound(this.soundPause);
                break;
            case 32: // space
                this.activeField.hardDrop();
                break;
            case 37: // left
                this.activeField.moveLeft();
                break;
            case 38: // up
                this.activeField.rotate();
                break;
            case 39: // right
                this.activeField.moveRight();
                break;
            case 40: // down
                this.activeField.softDrop();
                break;
                //case 87: // 'w'
                //startWarpEffect();
                //break;
        }
    }

    /** User stopped pushing a key */
    private _onKeyUp(e) {
        e = e || window.event;

        // mark key as no longer pressed
        this.keyState[e.keyCode] = null;
    }

    private _initialize() {
        window.requestAnimationFrame = window.requestAnimationFrame || window['mozRequestAnimationFrame'] || window['webkitRequestAnimationFrame'] || window['msRequestAnimationFrame'];

        this.canvas = document.getElementById("canvasMain");
        if (this.canvas) {
            window.addEventListener("resize", (e: Event) => this._resizeCanvas());
            window.addEventListener("keydown", (e: Event) => this._onKeyDown(e));
            window.addEventListener("keyup", (e: Event) => this._onKeyUp(e));
            window.addEventListener("focusin", (e: Event) => this._onFocusIn(e));
            window.addEventListener("focusout", (e: Event) => this._onFocusOut(e));
            window.addEventListener("hashchange", (e: Event) => this._resetGame());

            this._resetGame();

            // load image resources from the server
            let img = new Image();
            img.onload = function () {
                this.cellStripImage = img;
            };
            img.src = "img/tetris_cells.png";

            let imgVortex = new Image();
            imgVortex.onload = function () {
                this.vortexImage = imgVortex;
            };
            imgVortex.src = "img/vortex.png";

            let starImage = new Image();
            starImage.onload = function () {
                this.starImage = starImage;
            };
            starImage.src = "img/star.png";


            // initialize audio channels
            this.audioChan = [];
            for (let i = 0; i < Constants.MAX_AUDIO_CHANELS; i++) {
                this.audioChan[i] = {
                    channel: new Audio(),
                    finished: -1,
                };
            }

            // preload audio
            function loadAudio(src) {
                let audio = new Audio(src);
                audio.preload = 'auto';
                audio.load();
                return audio;
            }
            this.soundRotate = loadAudio("audio/shift.mp3");
            this.soundHit = loadAudio("audio/hit.mp3");
            this.soundShift = loadAudio("audio/shift.mp3");
            this.soundClear = loadAudio("audio/clear.mp3");
            this.soundWarp = loadAudio("audio/warp.mp3");
            this.soundGameOver = loadAudio("audio/gameover.mp3");
            this.soundPause = loadAudio("audio/pause.mp3");

            this._resetStars();

            this._resizeCanvas();
            this._drawFrame(0);
        }
    }

    private _resetGame() {
        this.fields = [];

        this.activeField = new Field();
        this.fields.push(this.activeField);

        let query = Helpers.Dom.getQueryStringAsDictionary();
        if (query["ReplayID"]) {
            this.offlineMode = true;
            let replayID = query["ReplayID"];
            if (replayID) {
                this.activeField.playReplay(replayID);
            }
        }
        else {
            this.activeConnection = new ServerConnection(this);
            //this.activeConnection.connect("ws://localhost:17100/api/Tetris")
        }

        /*
        if (window.location.hash == "#multifield") {
            this.fields.push(new Field());
            this.fields.push(new Field());
            this.fields.push(new Field());
        }
        */

        this._resizeCanvas();
    }

    private _resetStars() {
        this.stars = [];
        for (let i = 0; i < Constants.STAR_COUNT; i++) {
            let angle = Helpers.Math.getRand(0, 2 * Math.PI);
            let dx = Math.cos(angle);
            let dy = Math.sin(angle);
            let newStar = {
                x: 0,
                y: 0,
                dx: dx, // direction vector X component
                dy: dy, // direction vector Y component
                scale: Helpers.Math.getRand(0.1, 0.5),
                speed: Helpers.Math.getRand(1.0, 2.5),
                life: 0
            };

            // stars spawn at a random place along their life span so they're not all clumped together at the center
            let life = Helpers.Math.getRand(0, Constants.STAR_LIFESPAN);
            newStar.x += dx * life * Constants.STAR_SPEED;
            newStar.y += dy * life * Constants.STAR_SPEED;
            newStar.life = life;

            this.stars.push(newStar);
        }
    }

    private _resizeCanvas() {
        if (this.canvas) {
            this.width = window.innerWidth;
            this.height = this.width * (Constants.FIXED_HEIGHT / Constants.FIXED_WIDTH);

            if (this.height > window.innerHeight) {
                this.height = window.innerHeight;
                this.width = this.height * (Constants.FIXED_WIDTH / Constants.FIXED_HEIGHT)
            }

            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.canvas.style.width = this.width + "px";
            this.canvas.style.height = this.height + "px";
            this.canvas.style.position = "absolute";
            this.canvas.style.left = (window.innerWidth / 2 - this.width / 2) + "px";
            this.canvas.style.top = (window.innerHeight / 2 - this.height / 2) + "px";

            if (this.activeField) {
                this.activeField.setCellScale(Constants.CELL_SIZE);
                let fieldWidth = Constants.FIELD_COLUMN_COUNT * this.activeField.getCellScale();
                let fieldHeight = (Constants.FIELD_ROW_COUNT - Constants.FIELD_HIDDEN_ROW_COUNT) * this.activeField.getCellScale();
                //if ((this.width < fieldWidth) || (this.height < fieldHeight)) {
                //this.activeField.cellScale = 16;
                //}
                //fieldWidth = Constants.fieldColumnCount * this.activeField.cellScale;
                //fieldHeight = (Constants.fieldRowCount - Constants.fieldHiddenRowCount) * this.activeField.cellScale;
                this.scaleX = this.width / Constants.FIXED_WIDTH;
                this.scaleY = this.height / Constants.FIXED_HEIGHT;
                this.width = Constants.FIXED_WIDTH;
                this.height = Constants.FIXED_HEIGHT;

                if (window.location.hash == "#multifield") {
                    for (let i = 0, len = this.fields.length; i < len; i++) {
                        let field = this.fields[i];
                        field.x = 200 * i + 100;
                        field.y = 100;
                        field.cellScale = 16;
                    }
                }
                else {
                    this.activeField.setCanvasLocation(
                        this.width / 2 - fieldWidth / 2,
                        this.height / 2 - fieldHeight / 2
                    );
                }
            }
        }
    }

    private _runGame(step: number) {
        this.stepTime += step;

        while (this.stepTime > Constants.TIME_STEP) {
            this.stepTime -= Constants.TIME_STEP;

            this._updateInputState(Constants.TIME_STEP);

            if (this.offlineMode || (this.activeConnection && this.activeConnection.isOpen())) {
                this.statusText = "";

                if (this.pauseMode == 0) {
                    this.elapsedTime += Constants.TIME_STEP;

                    for (let i = 0, len = this.fields.length; i < len; i++) {
                        let field = this.fields[i];
                        field.update(Constants.TIME_STEP * this.timeMultiply);
                    }
                }

            }
            else {
                this.statusText = "Connecting...";
            }
        }
    }

    /** Periodically check to see if keys are still pressed, and trigger events if they repeat */
    private _updateInputState(step: number) {
        this.timeMultiply = 1;

        for (let prop in this.keyState) {
            let key = this.keyState[prop];
            let keyCode = parseInt(prop, 10);
            if (key && key.pressed) {
                key.duration += step;

                // if key has been pressed long enough and repeats are supported for this key, start triggering repeats
                if (key.duration > Constants.REPEAT_DELAY && (Constants.REPEATED_KEY_CODES.indexOf(keyCode) > -1)) {
                    if (key.repeatStep <= 0) {
                        // time until another repeat happens
                        key.repeatStep = Constants.REPEAT_PERIOD;
                    }
                    else {
                        // repeat is ready, trigger the event
                        key.repeatStep -= step;
                        if (key.repeatStep <= 0) {
                            this._handleKeyPress(keyCode);
                        }
                    }
                }

                // debug key, when ~ is pushed, speed up time
                if (keyCode == 192) {
                    this.timeMultiply = 10;
                }
            }
        }
    }
}