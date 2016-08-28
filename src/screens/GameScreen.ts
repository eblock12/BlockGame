import * as Constants from '../Constants';
import Field from '../Field';
import Helpers from '../helpers';
import Input, {InputCommand} from '../Input';
import IScreen from './IScreen';
import Page from '../Page';
import Starfield from '../Starfield';

export default class GameScreen implements IScreen {
    // collection of Fields that are being updated/renderered, normally there's just one, but there could be more
    // to enable multiplayer
    private _fields: Field[];

    // the current Field that the player is controlling
    private _activeField: Field;

    // background "star field" effect
    private _starfield: Starfield;

    // the amount of "pauseness", when its 0 the game is unpaused
    private _pauseMode: number;

    // animates the pause text scaling effect
    private _pauseTextPulse: number;

    // toggles user-controlled pausing
    private _userPauseMode = false;

    private _enableFadeIn: boolean;
    private _fadeInTime: number;

    constructor() {
        this._starfield = new Starfield();
        this._pauseMode = 0;
        this._pauseTextPulse = 0;
    }

    public draw(ctx: CanvasRenderingContext2D, step: number) {
        let page = Page.current;
        let width = page.width;
        let height = page.height;
     
        this._layoutFields();

        // set to identity matrix
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(page.scaleX, page.scaleY);

        // render the game background effects
        this._starfield.draw(ctx, width, height, step);

        // if paused, render the pause text
        if (this._pauseMode > 0) {
            ctx.save();
            ctx.font = Constants.PAUSE_FONT;
            let pauseWidth = ctx.measureText("PAUSE").width;
            let textX = width / 2 - pauseWidth / 2;
            let textY = height / 2 + Constants.PAUSE_FONT_SIZE / 2 - 16;

            let scale = Math.sin(this._pauseTextPulse * 10) * 0.05 + 1;
            this._pauseTextPulse += step;

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
            for (let field of this._fields) {
                field.draw(ctx);
            }
        }

        // render the active field's score boxes
        if (this._activeField) {
            this._activeField.drawScore(ctx);
        }

        if (this._enableFadeIn) {
            ctx.save();
            ctx.globalAlpha = 1 - Math.min(this._fadeInTime, 1);
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, Page.current.width, Page.current.height);
            ctx.restore();
        }
    }

    public enter(finished: () => void) {
        Input.on(InputCommand.hardDrop, () => this._onHardDrop());
        Input.on(InputCommand.softDrop, () => this._onSoftDrop());
        Input.on(InputCommand.shiftLeft, () => this._onShiftLeft());
        Input.on(InputCommand.shiftRight, () => this._onShiftRight());
        Input.on(InputCommand.rotate, () => this._onRotate());
        Input.on(InputCommand.pause, () => this._onPause());

        this._resetGame();

        this._enableFadeIn = true
        this._fadeInTime = 0;
        this._activeField.setPaused(true);

        finished();
    }

    public exit(finished: () => void) {
        Input.offAll();

        finished();
    }

    public update(step: number) {
        if (this._enableFadeIn) {
            this._fadeInTime += step;
            if (this._fadeInTime > 1.5) {
                this._enableFadeIn = false;
                this._activeField.setPaused(false);
            }
        } else {
            for (let field of this._fields) {
                field.update(step);
            }
        }
    }

    private _isInputAllowed() {
        return !this._enableFadeIn;
    }

    private _layoutFields() {
        if (this._activeField) {
            this._activeField.setCellScale(Constants.CELL_SIZE);
            let fieldWidth = Constants.FIELD_COLUMN_COUNT * this._activeField.getCellScale();
            let fieldHeight = (Constants.FIELD_ROW_COUNT - Constants.FIELD_HIDDEN_ROW_COUNT) * this._activeField.getCellScale();

            if (window.location.hash == "#multifield") {
                for (let i = 0, len = this._fields.length; i < len; i++) {
                    let field = this._fields[i];
                    field.setCanvasLocation(200 * i + 100, 100);
                    field.setCellScale(16);
                }
            }
            else {
                this._activeField.setCanvasLocation(
                    Page.current.width / 2 - fieldWidth / 2,
                    Page.current.height / 2 - fieldHeight / 2
                );
            }
        }
    }

    private _onHardDrop() {
        if (!this._isInputAllowed()) {
            return;
        }

        if (this._activeField) {
            this._activeField.hardDrop();
        }
    }

    private _onPause() {
        if (!this._isInputAllowed()) {
            return;
        }

        this._userPauseMode = !this._userPauseMode;
        this._pauseMode += this._userPauseMode ? 1 : -1;
        Helpers.Audio.playSound(Page.current.soundPause);
        this._activeField.setPaused(this._userPauseMode);
    }

    private _onRotate() {
        if (!this._isInputAllowed()) {
            return;
        }

        if (this._activeField) {
            this._activeField.rotate();
        }
    }

    private _onShiftLeft() {
        if (!this._isInputAllowed()) {
            return;
        }

        if (this._activeField) {
            this._activeField.moveLeft();
        }
    }

    private _onShiftRight() {
        if (!this._isInputAllowed()) {
            return;
        }

        if (this._activeField) {
            this._activeField.moveRight();
        }
    }

    private _onSoftDrop() {
        if (!this._isInputAllowed()) {
            return;
        }

        if (this._activeField) {
            this._activeField.softDrop();
        }
    }

    private _resetGame() {
        this._fields = [];
        this._activeField = new Field();
        this._starfield = new Starfield();
        this._fields.push(this._activeField);

        this._activeField.levelChangeEvent.on(() => this._starfield.startWarpEffect());

        let query = Helpers.Dom.getQueryStringAsDictionary();
        if (query["ReplayID"]) {
            Page.current.offlineMode = true;
            let replayID = query["ReplayID"];
            if (replayID) {
                this._activeField.playReplay(replayID);
            }
        }
        else {
            //this.activeConnection = new ServerConnection(this);
            //this.activeConnection.connect("ws://localhost:17100/api/Tetris")
        }

        /*
        if (window.location.hash == "#multifield") {
            this.fields.push(new Field());
            this.fields.push(new Field());
            this.fields.push(new Field());
        }
        */
    }
}