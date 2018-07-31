import * as Constants from './Constants';
import Event from './Event';
import Page from './Page';
import Piece from './Piece';
import PieceBag from './PieceBag';
import Helpers from './helpers';

/**
 * Stores the state of a game field (where pieces fall into and get locked down), handles its rendering and physics
 * Replays can also be ran inside a Field, which disables user input
 */
export default class Field {
    /** Event that fires when the level is changed in the field */
    public levelChangeEvent: Event<number> = new Event<number>(); 

    // stores the colors of all the cells in the Field (width * height)
    private _cells: number[] = [];

    // stores a collection of row indices that need to be cleared
    private _rowsToClear: number[] = [];

    // when this is non-zero, an animation plays to clear the rows in _rowsToClear, the animation is finished when it reaches 0
    private _rowClearTime: number = 0;

    // the piece that is currently falling in this Field
    private _activePiece: Piece = null;

    // bag of shuffled pieces to select the next piece from
    private _pieceBag: PieceBag = null;

    // the number of seconds remaining until the piece falls by gravity
    private _activePieceFallTime: number = 0;

    // the number of seconds remaining until the piece is locked to the game Field
    private _activePieceLockTime: number = 0;

    // the next piece that will spawn after the current piece is locked
    private _nextPiece: Piece = null;

    // a transparent piece that indicates where a piece will end up after a hard drop
    private _ghostPiece: Piece = null;

    // the current speed is a piece is falling at (seconds its dropped again)
    private _fallSpeed: number;

    // the level number
    private _level: number = 1;

    // the player's current score in this Field
    private _score: number = 0;

    // the number of lines that have been cleared
    private _lines: number = 0;

    // when this is true, no new pieces are spawned and the game over text is displayed
    private _gameOver: boolean = false;

    // game over text animation state
    private _gameOverTextBounce: number = 0;
    private _gameOverTextBounceStep: number = 0.65;

    // when this is true we're playing back a replay and not responding to player input
    private _replayMode: boolean = false;

    // when this is true we're waiting on the server to send replay data
    private _loadingReplay: boolean = false;

    // stores the array of instructions that make of the Replay data
    private _replayInstructions = [];

    // the number of seconds elapsed in the current replay
    private _replayTime: number = 0;

    // the current instruction pointer within the replay
    private _replayIndex: number = 0;

    private _paused: boolean;

    // pixel location of this game Field within the canvas
    private _x: number = 0;
    private _y: number = 0;

    // width and height of cells within this Field
    private _cellScale: number = 32;

    constructor() {
        // cells are initially 0
        let cellCount = Constants.FIELD_COLUMN_COUNT * Constants.FIELD_ROW_COUNT;
        for (let i = 0; i < cellCount; i++) {
            this._cells[i] = 0;
        }
        this._fallSpeed = Constants.LEVEL_SPEEDS[this._level - 1];
        this._pieceBag = new PieceBag();
        this._nextPiece = new Piece(this._pieceBag.getNewPieceType());
    }

    // draws the game field using the specified canvas 2D context
    public draw(ctx: CanvasRenderingContext2D) {
        ctx.save();

        let fieldWidth = Constants.FIELD_COLUMN_COUNT * this._cellScale;
        let fieldHeight = (Constants.FIELD_ROW_COUNT - Constants.FIELD_HIDDEN_ROW_COUNT) * this._cellScale;

        // move origin to top-left of field
        ctx.translate(Math.floor(this._x), Math.floor(this._y));

        // draw field border
        ctx.beginPath();
        ctx.rect(-Constants.FIELD_BORDER_WIDTH + 2, -Constants.FIELD_BORDER_WIDTH + 2, fieldWidth + Constants.FIELD_BORDER_WIDTH, fieldHeight + Constants.FIELD_BORDER_WIDTH);
        ctx.lineWidth = Constants.FIELD_BORDER_WIDTH;
        ctx.strokeStyle = Constants.FIELD_BORDER_COLOR;
        ctx.stroke();

        // define field clipping region
        ctx.beginPath();
        ctx.rect(0, 0, fieldWidth, fieldHeight);
        ctx.clip();

        // draw field background
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.rect(0, 0, fieldWidth, fieldHeight);
        ctx.fillStyle = Constants.FIELD_BACKGROUND_COLOR;
        ctx.fill();
        ctx.restore();

        // draws all the cells in the game field
        for (let cellY = 0, visibleRowCount = Constants.FIELD_ROW_COUNT - Constants.FIELD_HIDDEN_ROW_COUNT; cellY < visibleRowCount; cellY++) {
            for (let cellX = 0; cellX < Constants.FIELD_COLUMN_COUNT; cellX++) {
                let cellIndex = (cellY + Constants.FIELD_HIDDEN_ROW_COUNT) * Constants.FIELD_COLUMN_COUNT + cellX;
                let cell = this._cells[cellIndex];

                if (cell != 0) {
                    Helpers.Render.drawCellFromStrip(ctx, Math.floor(cellX * this._cellScale), Math.floor(cellY * this._cellScale), cell, this._cellScale);
                }
            }
        }

        // draw the currently falling piece
        if (this._activePiece) {
            //_activePiece.offsetY = Math.round((_activePieceFallTime / _fallSpeed) * this.cellScale);
            //if (this._doesPieceCollide(_activePiece, 0 /*dx*/, 1 /*dy*/)) {
            //_activePiece.offsetY = 0;
            //}
            this._activePiece.draw(ctx, this._cellScale, true /*highlight*/);
        }

        // draws the ghost piece
        if (this._ghostPiece) {
            ctx.save();
            ctx.globalAlpha = 0.2;
            this._ghostPiece.draw(ctx, this._cellScale);
            ctx.restore();
        }

        // draws the game over text
        if (this._gameOver) {
            ctx.save();

            ctx.font = Constants.BIG_FIELD_FONT;
            let gameWidth = ctx.measureText("GAME").width;
            let overWidth = ctx.measureText("OVER").width;
            let gameX = fieldWidth / 2 - gameWidth / 2;
            let overX = fieldWidth / 2 - overWidth / 2;
            let gameOverY = this._cellScale * 6 + this._gameOverTextBounce;

            let gameGradient = ctx.createLinearGradient(0, gameOverY - Constants.BIG_FIELD_FONT_SIZE, 0, gameOverY);
            gameGradient.addColorStop(0, "rgb(255,255,255)");
            gameGradient.addColorStop(1, "rgb(211,129,39)");
            ctx.fillStyle = gameGradient;

            ctx.fillText("GAME", gameX, gameOverY);
            ctx.translate(0, Constants.BIG_FIELD_FONT_SIZE);
            ctx.fillText("OVER", overX, gameOverY);

            ctx.strokeStyle = "#000";
            ctx.lineWidth = 3;
            ctx.translate(0, -Constants.BIG_FIELD_FONT_SIZE);
            ctx.strokeText("GAME", gameX, gameOverY);
            ctx.translate(0, Constants.BIG_FIELD_FONT_SIZE);
            ctx.strokeText("OVER", overX, gameOverY);

            ctx.restore();
        }

        ctx.restore();
    }

    // draws the score boxes on the left and right of the Field
    public drawScore(ctx) {
        let boxWidth = 103;
        let boxHeight = 160;
        let fieldWidth = Constants.FIELD_COLUMN_COUNT * this._cellScale;
        let fieldHeight = (Constants.FIELD_ROW_COUNT - Constants.FIELD_HIDDEN_ROW_COUNT) * this._cellScale;

        // draws the left score box
        Helpers.Render.drawWindow(ctx, this._x - boxWidth - 50, this._y + fieldHeight / 2 - boxHeight / 2, boxWidth, boxHeight, () => {
            ctx.fillStyle = "#FFF";
            ctx.strokeStyle = "rgb(82, 190, 223)";
            ctx.lineWidth = 0.5;
            ctx.font = Constants.SCORE_FONT;

            // TODO: Need to refactor this

            // draws score text
            function drawGradientText(text, width, height) {
                let gradient = ctx.createLinearGradient(0, -height, 0, 0);
                gradient.addColorStop(0, "rgb(188,235,188)");
                gradient.addColorStop(1, "rgb(82,188,82)");
                ctx.fillStyle = gradient;
                ctx.fillText(text, 0, 0);
                ctx.strokeText(text, 0, 0);
            }

            // draw the "Score" label
            ctx.save();
            ctx.translate(8, 4 + Constants.SCORE_FONT_SIZE);
            ctx.fillText("SCORE", 0, 0);
            ctx.strokeText("SCORE", 0, 0);
            ctx.restore();

            // draw the actual Score
            ctx.save();
            let scoreText = this._score.toString();
            let scoreWidth = ctx.measureText(scoreText).width;
            ctx.translate(boxWidth - 8 - scoreWidth, 4 + Constants.SCORE_FONT_SIZE * 2);
            drawGradientText(scoreText, scoreWidth, Constants.SCORE_FONT_SIZE);
            ctx.restore();

            // draw the "Lines" label
            ctx.save();
            ctx.translate(8, 4 + Constants.SCORE_FONT_SIZE * 4);
            ctx.fillText("LINES", 0, 0);
            ctx.strokeText("LINES", 0, 0);
            ctx.restore();

            // draw the actual Lines
            ctx.save();
            let linesText = this._lines.toString();
            let linesWidth = ctx.measureText(linesText).width;
            ctx.translate(boxWidth - 8 - linesWidth, 4 + Constants.SCORE_FONT_SIZE * 5);
            drawGradientText(linesText, linesWidth, Constants.SCORE_FONT_SIZE);
            ctx.restore();

            // draw the Level label
            ctx.save();
            ctx.translate(8, 4 + Constants.SCORE_FONT_SIZE * 7);
            ctx.fillText("LEVEL", 0, 0);
            ctx.strokeText("LEVEL", 0, 0);
            ctx.restore();

            // draw the actual Level
            ctx.save();
            let levelText = this._level.toString();
            let levelWidth = ctx.measureText(levelText).width;
            ctx.translate(boxWidth - 8 - levelWidth, 4 + Constants.SCORE_FONT_SIZE * 8);
            drawGradientText(levelText, levelWidth, Constants.SCORE_FONT_SIZE);
            ctx.restore();
        });

        // draws the righthand next piece box
        if (this._nextPiece) {
            boxWidth = 144;
            boxHeight = 150;
            Helpers.Render.drawWindow(ctx, this._x + 50 + fieldWidth, this._y + fieldHeight / 2 - boxHeight / 2, boxWidth, boxHeight, () => {
                ctx.fillStyle = "#FFF";
                ctx.strokeStyle = "rgb(82, 190, 223)";
                ctx.lineWidth = 0.5;
                ctx.font = Constants.SCORE_FONT;

                ctx.save();
                ctx.translate(8, 4 + Constants.SCORE_FONT_SIZE);
                ctx.fillText("NEXT", 0, 0);
                ctx.strokeText("NEXT", 0, 0);
                ctx.restore();

                // don't show next piece while the game is paused
                if (!this._paused) {
                    let offsetX = 24;
                    let offsetY = Constants.SCORE_FONT_SIZE * 2;

                    // fiddle with the piece offset for certain types of pieces
                    switch (this._nextPiece.typeIndex) {
                        case 0:
                            offsetX = 8;
                            break;
                        case 3:
                            offsetX = 8;
                            offsetY += 12;
                            break;
                        default:
                            offsetY += 12;
                            break;
                    }
                    this._nextPiece.draw(ctx, Constants.CELL_SIZE, false, offsetX, offsetY);
                }
            });
        }
    }

    /** Returns the Piece that is currently falling */
    public getActivePiece(): Piece {
        return this._activePiece;
    }

    /** Gets the collection of Cells for this Field */
    public getCells() {
        return this._cells;
    }

    /** Gets the width/height of the cells in this Field */
    public getCellScale() {
        return this._cellScale;
    }

    /** Returns an object containing the current score, level, and line cont */
    public getScoreData() {
        return { score: this._score, level: this._level, lines: this._lines };
    }

    /** Performs a hard drop (piece is moved down until it collides) */
    public hardDrop() {
        // keep track of how far the piece fell
        let dropCount = 0;

        // ignore input during replays
        if (this._replayMode) {
            return;
        }

        // keep moving piece down until it collides
        while (!this._doesPieceCollide(this._activePiece, 0 /*dx*/, 1 /*dy*/)) {
            this._activePiece.cellY++;
            dropCount++;
        }

        // did piece even fall at all?
        if (dropCount > 0) {
            // send Piece update to server
            this._handlePieceUpdate();

            // increment score for hard drop times the number of lines it fell
            this._score += dropCount * Constants.SCORE_HARD_DROP;

            // reset the time until the piece is dropped due to gravity (this is probably unnecessary since we're already at the bottom but whatever)
            this._activePieceFallTime = 0;

            // hard drop locks the piece instantly
            this._activePieceLockTime = 0;
        }
    }

    /** Tries to shift the active piece left */
    public moveLeft() {
        // ignore input during replays
        if (this._replayMode) {
            return;
        }

        // if there's room for it, move the piece left
        if (!this._doesPieceCollide(this._activePiece, -1 /*dx*/)) {
            this._activePiece.cellX--;

            // moving pieces resets the piece lock delay
            this._activePieceLockTime = Constants.LOCK_DELAY;

            // send Piece update to the server
            this._handlePieceUpdate();

            Helpers.Audio.playSound(Page.current.soundShift);
        }
    }

    /** Tries to shift the active piece right */
    public moveRight() {
        // ignore input during replays
        if (this._replayMode) {
            return;
        }

        // if there's room for it, move the piece right
        if (!this._doesPieceCollide(this._activePiece, 1 /*dx*/)) {
            this._activePiece.cellX++;

            // moving pieces resets the piece lock delay
            this._activePieceLockTime = Constants.LOCK_DELAY;

            // send Piece update to the server
            this._handlePieceUpdate();

            Helpers.Audio.playSound(Page.current.soundShift);
        }
    }

    /** Loads a replay with the requested ID from the server, and starts playback */
    public playReplay(replayID: string) {
        this._replayMode = true;

        // set initial Field state for replay playback
        let cellCount = Constants.FIELD_COLUMN_COUNT * Constants.FIELD_ROW_COUNT;
        for (let i = 0; i < cellCount; i++) {
            this._cells[i] = 0;
        }
        this._activePiece = null;
        this._nextPiece = null;
        this._ghostPiece = null;
        this._score = 0;
        this._level = 1;
        this._lines = 0;
        this._fallSpeed = Constants.LEVEL_SPEEDS[this._level - 1];

        // now waiting on the server for replay data
        this._loadingReplay = true;

        // do XHR request for the replay data
        let request = new XMLHttpRequest();
        request.open("GET", "http://localhost:17100/api/Tetris/GetReplayInstructions/" + replayID, true);
        request.onreadystatechange = (evt) => {
            if (request.readyState == 4) {
                if (request.status == 200) {
                    // request returned data, parse instruction array and start the replay
                    this._replayInstructions = JSON.parse(request.responseText);
                    this._loadingReplay = false;
                    this._replayTime = 0;
                    this._replayIndex = 0;
                }
                // TODO: Error handle
            }
        };
        request.send(null);
    }

    /** Tries to rotate the piece */
    public rotate() {
        // ignore input during replays
        if (this._replayMode) {
            return;
        }

        // tests if piece collides after rotation
        if (!this._doesPieceCollide(this._activePiece, 0 /*dx*/, 0 /*dy*/, 1 /*drotation*/)) {
            // rotation is wraped between 0 and 4
            this._activePiece.rotation = (this._activePiece.rotation + 1) % 4;

            // rotating resets the lock delay
            this._activePieceLockTime = Constants.LOCK_DELAY;

            // send updated rotation to the server
            this._handlePieceUpdate();
            Helpers.Audio.playSound(Page.current.soundRotate);
        }
        else if (this._activePiece) {
            // test for wall kicks, allows the piece to be shifted in location slightly to permit the rotation to happen

            // for "I" shaped pieces, use a special lookup table
            let wallKickTable = (this._activePiece.typeIndex == 0) ? Constants.WALL_KICK_TABLE_ALT : Constants.WALL_KICK_TABLE;

            // get the appropiate wall kick table for the current rotation
            let stepTable = wallKickTable[this._activePiece.rotation];

            // each rotation tests for 4 possible steps
            for (let step = 0; step < 4; step++) {
                // each step has a X and Y offset
                let offsetX = stepTable[step][0];
                let offsetY = stepTable[step][1];

                // apply the offsets to the rotation collision test and see if it works
                if (!this._doesPieceCollide(this._activePiece, offsetX /*dx*/, offsetY /*dy*/, 1 /*drotation*/)) {
                    // wall kick is allowed, apply the appropiate location shift and new rotation
                    this._activePiece.rotation = (this._activePiece.rotation + 1) % 4;
                    this._activePiece.cellX += offsetX;
                    this._activePiece.cellY += offsetY;

                    // rotation always resets the lock delay
                    this._activePieceLockTime = Constants.LOCK_DELAY;

                    // send updated location/rotation to the server
                    this._handlePieceUpdate();
                    Helpers.Audio.playSound(Page.current.soundRotate);
                    break;
                }
            }
        }
    }

    /** Sets the coordinates of this Field within the Canvas */
    public setCanvasLocation(x: number, y: number) {
        this._x = x;
        this._y = y;
    }

    /** Sets the width/height dimension of a cell within this Field */
    public setCellScale(newCellScale: number) {
        this._cellScale = newCellScale;
    }

    public setPaused(paused: boolean) {
        this._paused = paused;
    }

    /** Performs a "soft drop" of a single row for the active piece */
    public softDrop() {
        // ignore input during replays
        if (this._replayMode) {
            return;
        }

        // test for collision
        if (!this._doesPieceCollide(this._activePiece, 0 /*dx*/, 1 /*dy*/)) {
            this._activePiece.cellY++;

            // reset the time to next "auto-drop" time due to gravity
            this._activePieceFallTime = 0;

            // increment score for each row the user drops the piece
            this._score += Constants.SCORE_SOFT_DROP;

            // soft dropping a piece resets the lock delay
            this._activePieceLockTime = Constants.LOCK_DELAY;

            // notify server of new Piece location
            this._handlePieceUpdate();
            Helpers.Audio.playSound(Page.current.soundShift);
        }
    };

    /** Performs physics updates for the Field, animations, and plays back the Replay (if active) */
    public update(step: number) {
        // are we running a replay?
        if (this._replayMode && !this._loadingReplay) {
            // run the replay until out of instructions
            if (this._replayIndex < this._replayInstructions.length) {

                // increment time the replay has been running
                this._replayTime += step;

                // run instructions until we're past the current _replayTime or out of instructions
                for (let len = this._replayInstructions.length; this._replayIndex < len; this._replayIndex++) {
                    // fetch a new replay instruction
                    let nextInstruction = this._replayInstructions[this._replayIndex];

                    // run instructions as long as its within _replayTime
                    if (nextInstruction.timestamp <= this._replayTime) {
                        if (nextInstruction.typeIndex === -1) {
                            // instruction is clearing the piece
                            this._activePiece = null;
                        }
                        else if (typeof nextInstruction.typeIndex != "undefined") {
                            // instruction is updating the current Piece location or rotation, or creating a new Piece
                            if (this._activePiece == null) {
                                this._activePiece = new Piece(undefined);
                            }
                            this._activePiece.typeIndex = nextInstruction.typeIndex;
                            this._activePiece.cellX = nextInstruction.x;
                            this._activePiece.cellY = nextInstruction.y;
                            this._activePiece.rotation = nextInstruction.rotation;
                            this._activePieceFallTime = 0;
                            this._activePieceLockTime = Constants.LOCK_DELAY;
                            this._updateGhostPiece();
                        }
                        else if (nextInstruction.cells) {
                            // instruction is updating the Field state (cells and score, etc)
                            this._cells = nextInstruction.cells;
                            this._score = nextInstruction.score;
                            this._lines = nextInstruction.lines;
                            this._level = nextInstruction.level;
                            this._fallSpeed = Constants.LEVEL_SPEEDS[this._level - 1];
                        }
                    }
                    else {
                        // ran out of instructions to run for the current elapsed time
                        break;
                    }
                }
            }
        }

        // animate the game over text if we're in game over mode
        if (this._gameOver) {
            this._gameOverTextBounce += this._gameOverTextBounceStep
            if (this._gameOverTextBounce > 4) {
                this._gameOverTextBounce = 4;
                this._gameOverTextBounceStep = -this._gameOverTextBounceStep;
            }
            else if (this._gameOverTextBounce < -4) {
                this._gameOverTextBounce = -4;
                this._gameOverTextBounceStep = -this._gameOverTextBounceStep;
            }

            // stop doing any physics processing on the Field
            return; // early return
        }

        // if there's rows that need to be cleared, run the clear animation
        if (this._rowsToClear && this._rowsToClear.length > 0) {
            // when time is 0, the animation is finished
            this._rowClearTime -= step;

            // normalizes the animation time from 0 to 1, when it hits 1 the animation is finished
            let normalizedClearTime = 1 - this._rowClearTime / Constants.FIELD_ROW_CLEAR_TIME

            // when the animation is finished, rows above the cleared lines will fall down
            let linesCleared = 0;
            if (normalizedClearTime >= 1) {
                for (let i = 0; i < this._rowsToClear.length; i++) {
                    let y = this._rowsToClear[i] + i;
                    for (let y2 = y; y2 >= 0; y2--) {
                        for (let x = 0; x < Constants.FIELD_COLUMN_COUNT; x++) {
                            if (y2 > 0) {
                                this._cells[y2 * Constants.FIELD_COLUMN_COUNT + x] = this._cells[(y2 - 1) * Constants.FIELD_COLUMN_COUNT + x];
                            } else {
                                this._cells[y2 * Constants.FIELD_COLUMN_COUNT + x] = 0;
                            }
                        }
                    }
                    y++;
                    linesCleared++;
                }

                // animation is complete and rows have fallen, send update to the server about this
                this._rowsToClear = [];
                this._handleFieldUpdate();

                // clearing lines adds to score
                if (linesCleared > 0) {
                    this._lines += linesCleared;

                    switch (linesCleared) {
                        case 1:
                            this._score += Constants.SCORE_SINGLE_LINES * this._level;
                            break;
                        case 2:
                            this._score += Constants.SCORE_DOUBLE_LINES * this._level;
                            break;
                        case 3:
                            this._score += Constants.SCORE_TRIPLE_LINES * this._level;
                            break;
                        case 4:
                            this._score += Constants.SCORE_TETRIS_LINES * this._level;
                            break;
                    }
                }

                // increment level if needed
                let newLevel = Math.floor((this._lines + Constants.LINES_PER_LEVEL) / Constants.LINES_PER_LEVEL);
                if (newLevel > Constants.MAX_LEVEL) {
                    newLevel = Constants.MAX_LEVEL;
                }
                if (newLevel > this._level) {
                    // level was changed, get the new falling speed and start the background warp effect
                    this._level = newLevel;
                    this._fallSpeed = Constants.LEVEL_SPEEDS[this._level - 1];
                    this.levelChangeEvent.fire(this._level);
                }
            }
            else {
                // play the row clearing animation, it will clear cells starting at the center of the row, and working to the edges
                let cellsRemoved = Math.round((Constants.FIELD_COLUMN_COUNT / 2) * normalizedClearTime);
                for (let x = 0; x < cellsRemoved; x++) {
                    let leftCol = Constants.FIELD_COLUMN_COUNT / 2 - x - 1;
                    let rightCol = Constants.FIELD_COLUMN_COUNT / 2 + x;

                    for (let rowIndex = 0; rowIndex < this._rowsToClear.length; rowIndex++) {
                        let y = this._rowsToClear[rowIndex];
                        this._cells[leftCol + y * Constants.FIELD_COLUMN_COUNT] = 0;
                        this._cells[rightCol + y * Constants.FIELD_COLUMN_COUNT] = 0;
                    }
                }
            }
        }

        if (this._activePiece == null) {
            // need a new piece
            if (!this._replayMode && this._rowClearTime <= 0) {
                /// ...but not until all the pending rows are cleared
                this._activePieceLockTime = Constants.LOCK_DELAY;
                this._activePiece = this._nextPiece;
                this._nextPiece = new Piece(this._pieceBag.getNewPieceType());

                // if no room for a new piece, then it's game over
                if (this._doesPieceCollide(this._activePiece)) {
                    this._gameOver = true;
                    this._activePiece = null;
                    Helpers.Audio.playSound(Page.current.soundGameOver);
                }
                else {
                    // notify server about the new piece
                    this._handlePieceUpdate();
                }
            }
        }
        else if (this._doesPieceCollide(this._activePiece, 0 /*dx*/, 1 /*dy*/)) {
            // if piece is about to land

            // countdown to lock time
            this._activePieceLockTime -= step;
            if (this._activePieceLockTime <= 0) {
                // lock the piece to field
                this._mergeActivePiece();

                // play hit sound
                Helpers.Audio.playSound(Page.current.soundHit);

                // there is no longer an active piece
                this._activePiece = null;

                // send new Field state to the server
                this._handlePieceUpdate();
                this._handleFieldUpdate();

                // locking piece may have triggered line clear
                for (let y = Constants.FIELD_ROW_COUNT - 1; y >= 0; y--) {
                    let lineFull = true;

                    for (let x = 0; x < Constants.FIELD_COLUMN_COUNT; x++) {
                        if (this._cells[y * Constants.FIELD_COLUMN_COUNT + x] == 0) {
                            lineFull = false;
                            break;
                        }
                    }

                    if (lineFull) {
                        // schedule this row index for clearing
                        this._rowsToClear.push(y);
                        this._rowClearTime = Constants.FIELD_ROW_CLEAR_TIME;
                    }
                }

                if (this._rowClearTime == Constants.FIELD_ROW_CLEAR_TIME) {
                    Helpers.Audio.playSound(Page.current.soundClear);
                }
            }
        }
        else {
            // apply piece falling
            this._activePieceFallTime += step;
            if (this._activePieceFallTime >= this._fallSpeed) {
                if (!this._doesPieceCollide(this._activePiece, 0 /*dx*/, 1 /*dy*/)) {
                    this._activePieceFallTime = 0;
                    this._activePiece.cellY++;
                    this._activePieceLockTime = Constants.LOCK_DELAY;
                }
            }
        }
    }

    /** Returns true if the specified Piece is colliding with Cells in the game Field, and optionally applies a displacement to the Piece's position or rotation */
    private _doesPieceCollide(piece: Piece, dx?: number, dy?: number, drotation?: number): boolean {
        if (piece == null) {
            return true;
        }

        let pieceX = dx ? piece.cellX + dx : piece.cellX;
        let pieceY = dy ? piece.cellY + dy : piece.cellY;
        let pieceRotation = drotation ? (piece.rotation + drotation) % 4 : piece.rotation;
        let pieceIndex = piece.typeIndex;

        let pieceCells = Constants.PIECE_DATA[pieceIndex][pieceRotation];

        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                let cell = pieceCells[y * 4 + x];

                if (cell != 0) {
                    let cellX = pieceX + x;
                    let cellY = pieceY + y;
                    if ((cellX < 0) || (cellX >= Constants.FIELD_COLUMN_COUNT) || (cellY < 0) || (cellY >= Constants.FIELD_ROW_COUNT)) {
                        return true;
                    }

                    let cellIndex = cellY * Constants.FIELD_COLUMN_COUNT + cellX;
                    if (this._cells[cellIndex] != 0) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /** Sends the current Field state to the server */
    private _handleFieldUpdate() {
        /*if (!Page.current.offlineMode && Page.current.activeConnection && (this == Page.current.activeField)) {
            Page.current.activeConnection.handleFieldUpdate();
        }*/
    }

    /** Sends the state of the active Piece to the server */
    private _handlePieceUpdate() {
        /*if (!Page.current.offlineMode && Page.current.activeConnection && (this == Page.current.activeField)) {
            Page.current.activeConnection.handlePieceUpdate();
        }
        */
        this._updateGhostPiece();
    }

    /** Locks the active piece to the Field by merging it with the cells collection */
    private _mergeActivePiece() {
        if (this._activePiece == null) {
            return;
        }

        let pieceCells = this._activePiece.getCells();

        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                let cell = pieceCells[y * 4 + x];

                if (cell != 0) {
                    let cellX = this._activePiece.cellX + x;
                    let cellY = this._activePiece.cellY + y;
                    let cellIndex = cellY * Constants.FIELD_COLUMN_COUNT + cellX;
                    this._cells[cellIndex] = cell;
                }
            }
        }
    }

    /** Updates the location of the ghost piece */
    private _updateGhostPiece() {
        if (this._activePiece == null) {
            this._ghostPiece = null;
        }
        else {
            this._ghostPiece = new Piece(undefined);
            this._ghostPiece.typeIndex = this._activePiece.typeIndex;
            this._ghostPiece.cellX = this._activePiece.cellX;
            this._ghostPiece.cellY = this._activePiece.cellY;
            this._ghostPiece.rotation = this._activePiece.rotation;

            while (!this._doesPieceCollide(this._ghostPiece, 0, 1)) {
                this._ghostPiece.cellY++;
            }
        }
    }
}