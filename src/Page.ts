import * as Constants from './Constants';
import Field from './Field';
import Helpers from './Helpers';
import INetworkState from './INetworkState';
import ServerConnection from './ServerConnection';
import Starfield from './Starfield';

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
    public vortexImage: HTMLImageElement = null;

    // image used by the star particles in the background
    public starImage: HTMLImageElement = null;

    public starfield: Starfield = null;

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

    private _initialized = false;

    constructor() {
        if (document.readyState === 'complete') {
            this._initialize();
        } else {
            window.addEventListener('load', () => this._initialize());
        }
    }

    /** Called when the browser wants to render a new animation frame for this Page */
    private _drawFrame(frameTime: number) {
        window.requestAnimationFrame((step: number) => this._drawFrame(step));

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
        this.starfield.draw(ctx, this.width, this.height, step);

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
        if (this._initialized) {
            return; // early return
        }
        this._initialized = true;

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
            img.onload = () => {
                this.cellStripImage = img;
            };
            img.src = "img/tetris_cells.png";

            let imgVortex = new Image();
            imgVortex.onload = () => {
                this.vortexImage = imgVortex;
            };
            imgVortex.src = "img/vortex.png";

            let starImage = new Image();
            starImage.onload = () => {
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

            this._resizeCanvas();
            this._drawFrame(0);
        }
    }

    private _resetGame() {
        this.fields = [];

        this.activeField = new Field();
        this.starfield = new Starfield();
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