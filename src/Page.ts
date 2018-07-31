import * as Constants from './Constants';
import Field from './Field';
import GameScreen from './screens/GameScreen';
import TitleScreen from './screens/TitleScreen';
import Helpers from './helpers';
import Input from './Input';
import IScreen from './screens/IScreen';

/** Stores state and resources associated with the browser page */
export default class Page {
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

    private _activeScreen: IScreen;
    private _screenStack: IScreen[] = [];

    constructor() {
        if (document.readyState === 'complete') {
            this._initialize();
        } else {
            window.addEventListener('load', () => this._initialize());
        }
    }

    public getCurrentScreen(): IScreen {
        return this._activeScreen;
    }

    public pushScreen(screen: IScreen) {
        if (this._activeScreen) {
            // existing screen is active, wait for it to exit
            this._activeScreen.exit(() => {
                this._screenStack.unshift(screen);
                this._activeScreen = screen;
                this._activeScreen.enter(() => {});
            });
        } else {
            this._screenStack = [ screen ];
            this._activeScreen = screen;
            this._activeScreen.enter(() => {});
        }
    }

    public popScreen() {
        if (this._activeScreen) {
            this._activeScreen.exit(() => {
                this._activeScreen = this._screenStack.shift();
                this._activeScreen.enter(() => {});
            });
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

        if (this._activeScreen) {
            this._activeScreen.draw(ctx, step);
        }

        // run game logic for elapsed time
        this._runGame(step);

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

    private _initialize() {
        if (this._initialized) {
            return; // early return
        }
        this._initialized = true;

        Input.initialize();

        window.requestAnimationFrame = window.requestAnimationFrame || window['mozRequestAnimationFrame'] || window['webkitRequestAnimationFrame'] || window['msRequestAnimationFrame'];

        this.canvas = document.getElementById("canvasMain");
        if (this.canvas) {
            window.addEventListener("resize", (e: Event) => this._resizeCanvas());

            this._resizeCanvas();

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

            this.soundRotate = loadAudio("audio/shift.mp3");
            this.soundHit = loadAudio("audio/hit.mp3");
            this.soundShift = loadAudio("audio/shift.mp3");
            this.soundClear = loadAudio("audio/clear.mp3");
            this.soundWarp = loadAudio("audio/warp.mp3");
            this.soundGameOver = loadAudio("audio/gameover.mp3");
            this.soundPause = loadAudio("audio/pause.mp3");

            this._resizeCanvas();
            this._drawFrame(0);

            this.pushScreen(new TitleScreen());
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

            this.scaleX = this.width / Constants.FIXED_WIDTH;
            this.scaleY = this.height / Constants.FIXED_HEIGHT;
            this.width = Constants.FIXED_WIDTH;
            this.height = Constants.FIXED_HEIGHT;
        }
    }

    private _runGame(step: number) {
        this.stepTime += step;

        while (this.stepTime > Constants.TIME_STEP) {
            this.stepTime -= Constants.TIME_STEP;

            Input.update(Constants.TIME_STEP);

            if (this._activeScreen) {
                this._activeScreen.update(Constants.TIME_STEP);
            }

/*
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
            }*/
        }
    }
}

// preload audio
function loadAudio(src) {
    let audio = new Audio(src);
    audio.preload = 'auto';
    audio.load();
    return audio;
}