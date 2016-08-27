import * as Constants from './constants';

(function () {
    // canvas DOM element for the page
    let g_canvas = null;

    // width/height of the effective drawing area (this is normally fixed to 1280x720)
    let g_width = 0;
    let g_height = 0;

    // multipliers to scale the drawing area to the full dimensions of the canvas (updated on window resize)
    let g_scaleX = 1;
    let g_scaleY = 1;

    // timestamp of the last time of a frame was drawn (milliseconds)
    let g_lastFrameTime = 0;

    // time accumulated (seconds) since the last step (game/physics update) was performed
    // when this hits Constants.stepTime, we decrement and do physics updates until its exhausted
    let g_stepTime = 0;

    // time since the game was started (seconds)
    let g_elapsedTime = 0;

    // time multiplier applied to Field physics updates (1 is normal speed)
    let g_timeMultiply = 1;

    // stores the state of keys, if they're pressed and for how long
    // maps KeyCode to state object
    let g_keyState = {};

    // collection of Fields that are being updated/renderered, normally there's just one, but there could be more
    // to enable multiplayer
    let g_fields = [];

    // the current Field that the player is controlling
    let g_activeField;

    // the amount of "pauseness", when its 0 the game is unpaused
    let g_pauseMode = 0;

    // toggles user-controlled pausing
    let g_userPauseMode = false;

    // animates the pause text scaling effect
    let g_pauseTextPulse = 0;

    // the current ServerConnection that relays state updates to the server
    let g_activeConnection = null;

    // set to true to enable sound effects
    let g_enableAudio = false;

    // if true then don't try to connect to the server
    let g_offlineMode = true;

    // Composite image of all the possible cell colors
    let g_cellStripImage = null;

    // lookup table for each color's X offset within the cell strip image
    let g_cellStripOffset = [
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
    let g_vortexImage = null;

    // spin angle of the background vortex
    let g_vortexSpin = 0;

    // image used by the star particles in the background
    let g_starImage = null;

    // collection of star particles
    let g_stars = [];

    // countsdown the warp background effect (happens on level change), when it reaches 0 the effect is over
    let g_warpTime = 0;

    // collection of "streak" particles for the warp effect
    let g_warpStreaks = [];

    // when true, the star particles are pulled into the vortex (center of screen)
    let g_warpStarGravity = false;

    // when this is set to a string, it gets overlayed on top of the screen
    let g_statusText = null;

    // Audio channels
    let g_audioChan = [];

    // Sound effects
    let g_soundRotate = null;
    let g_soundHit = null;
    let g_soundClear = null;
    let g_soundShift = null;
    let g_soundWarp = null;
    let g_soundGameOver = null;
    let g_soundPause = null;

    // stores the cell layout of each possible piece, for all 4 possible rotations, is piece is stored in a 4x4 grid
    let g_pieces = [];
    g_pieces[0] = [[0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0],
                   [0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0],
                   [0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0],
                   [0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0]];
    g_pieces[1] = [[5, 0, 0, 0, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                   [0, 5, 5, 0, 0, 5, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0],
                   [0, 0, 0, 0, 5, 5, 5, 0, 0, 0, 5, 0, 0, 0, 0, 0],
                   [0, 5, 0, 0, 0, 5, 0, 0, 5, 5, 0, 0, 0, 0, 0, 0]];
    g_pieces[2] = [[0, 0, 6, 0, 6, 6, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                   [0, 6, 0, 0, 0, 6, 0, 0, 0, 6, 6, 0, 0, 0, 0, 0],
                   [0, 0, 0, 0, 6, 6, 6, 0, 6, 0, 0, 0, 0, 0, 0, 0],
                   [6, 6, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0]];
    g_pieces[3] = [[0, 3, 3, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                   [0, 3, 3, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                   [0, 3, 3, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                   [0, 3, 3, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
    g_pieces[4] = [[0, 7, 7, 0, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                   [0, 7, 0, 0, 0, 7, 7, 0, 0, 0, 7, 0, 0, 0, 0, 0],
                   [0, 0, 0, 0, 0, 7, 7, 0, 7, 7, 0, 0, 0, 0, 0, 0],
                   [7, 0, 0, 0, 7, 7, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0]];
    g_pieces[5] = [[0, 2, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                   [0, 2, 0, 0, 0, 2, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0],
                   [0, 0, 0, 0, 2, 2, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0],
                   [0, 2, 0, 0, 2, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0]];
    g_pieces[6] = [[1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                   [0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
                   [0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
                   [0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]];

    // Kick tables allow some play in the piece location when the user is rotating it
    // http://www.tetrisconcept.net/wiki/SRS#Wall_Kicks
    // table for J, L, S, T, Z shaped pieces
    let g_wallKickTable = [
        [[-1, 0], [-1, 1], [0, -2], [-1, -2]], // O->R
        [[1, 0], [1, -1], [0, 2], [1, 2]],     // R->2
        [[1, 0], [1, 1], [0, -2], [1, -2]],    // 2->L
        [[-1, 0], [-1, -1], [0, 2], [-1, 2]]   // L->O
    ];

    // alternate table for "I" shaped pieces
    let g_wallKickTableAlt = [
        [[-2, 0], [1, 0], [-2, -1], [1, 2]], // O->R
        [[-1, 0], [2, 0], [-1, 2], [2, -1]], // R->2
        [[2, 0], [-1, 0], [2, 1], [-1, -2]], // 2->L
        [[1, 0], [-2, 0], [1, -2], [-2, 1]]  // L->O
    ];

    //
    // Field
    // Stores the state of a game field (where pieces fall into and get locked down), handles its rendering and physics
    // Replays can also be ran inside a Field, which disables user input
    //
    let Field = function () {
        // stores the colors of all the cells in the Field (width * height)
        let m_cells = [];

        // stores a collection of row indices that need to be cleared
        let m_rowsToClear = [];

        // when this is non-zero, an animation plays to clear the rows in m_rowsToClear, the animation is finished when it reaches 0
        let m_rowClearTime = 0;

        // the piece that is currently falling in this Field
        let m_activePiece = null;

        // bag of shuffled pieces to select the next piece from
        let m_pieceBag = null;

        // the number of seconds remaining until the piece falls by gravity
        let m_activePieceFallTime = 0;

        // the number of seconds remaining until the piece is locked to the game Field
        let m_activePieceLockTime = 0;

        // the next piece that will spawn after the current piece is locked
        let m_nextPiece = null;

        // a transparent piece that indicates where a piece will end up after a hard drop
        let m_ghostPiece = null;

        // the current speed is a piece is falling at (seconds its dropped again)
        let m_fallSpeed;

        // the level number
        let m_level = 1;

        // the player's current score in this Field
        let m_score = 0;

        // the number of lines that have been cleared
        let m_lines = 0;

        // when this is true, no new pieces are spawned and the game over text is displayed
        let m_gameOver = false;

        // game over text animation state
        let m_gameOverTextBounce = 0;
        let m_gameOverTextBounceStep = 0.65;

        // when this is true we're playing back a replay and not responding to player input
        let m_replayMode = false;

        // when this is true we're waiting on the server to send replay data
        let m_loadingReplay = false;

        // stores the array of instructions that make of the Replay data
        let m_replayInstructions = [];

        // the number of seconds elapsed in the current replay
        let m_replayTime = 0;

        // the current instruction pointer within the replay
        let m_replayIndex = 0;

        // pixel location of this game Field within the canvas
        this.x = 0;
        this.y = 0;

        // width and height of cells within this Field
        this.cellScale = 32;

        // returns true if the specified Piece is colliding with Cells in the game Field, and optionally applies a displacement to the Piece's position or rotation
        this.doesPieceCollide = function (piece, /*optional*/ dx, /*optional*/ dy, /*optional*/ drotation) {
            if (piece == null) {
                return true;
            }

            let pieceX = dx ? piece.cellX + dx : piece.cellX;
            let pieceY = dy ? piece.cellY + dy : piece.cellY;
            let pieceRotation = drotation ? (piece.rotation + drotation) % 4 : piece.rotation;
            let pieceIndex = piece.typeIndex;

            let pieceCells = g_pieces[pieceIndex][pieceRotation];

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
                        if (m_cells[cellIndex] != 0) {
                            return true;
                        }
                    }
                }
            }

            return false;
        };

        // draws the game field using the specified canvas 2D context
        this.draw = function (ctx) {
            ctx.save();

            let fieldWidth = Constants.FIELD_COLUMN_COUNT * this.cellScale;
            let fieldHeight = (Constants.FIELD_ROW_COUNT - Constants.FIELD_HIDDEN_ROW_COUNT) * this.cellScale;

            // move origin to top-left of field
            ctx.translate(Math.floor(this.x), Math.floor(this.y));

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
                    let cell = m_cells[cellIndex];

                    if (cell != 0) {
                        drawCellFromStrip(ctx, Math.floor(cellX * this.cellScale), Math.floor(cellY * this.cellScale), cell, this.cellScale);
                    }
                }
            }

            // draw the currently falling piece
            if (m_activePiece) {
                //m_activePiece.offsetY = Math.round((m_activePieceFallTime / m_fallSpeed) * this.cellScale);
                //if (this.doesPieceCollide(m_activePiece, 0 /*dx*/, 1 /*dy*/)) {
                //m_activePiece.offsetY = 0;
                //}
                m_activePiece.draw(ctx, this.cellScale, true /*highlight*/);
            }

            // draws the ghost piece
            if (m_ghostPiece) {
                ctx.save();
                ctx.globalAlpha = 0.2;
                m_ghostPiece.draw(ctx, this.cellScale);
                ctx.restore();
            }

            // draws the game over text
            if (m_gameOver) {
                ctx.save();

                ctx.font = Constants.BIG_FIELD_FONT;
                let gameWidth = ctx.measureText("GAME").width;
                let overWidth = ctx.measureText("OVER").width;
                let gameX = fieldWidth / 2 - gameWidth / 2;
                let overX = fieldWidth / 2 - overWidth / 2;
                let gameOverY = this.cellScale * 6 + m_gameOverTextBounce;

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
        };

        // draws the score boxes on the left and right of the Field
        this.drawScore = function (ctx) {
            let boxWidth = 103;
            let boxHeight = 160;
            let fieldWidth = Constants.FIELD_COLUMN_COUNT * this.cellScale;
            let fieldHeight = (Constants.FIELD_ROW_COUNT - Constants.FIELD_HIDDEN_ROW_COUNT) * this.cellScale;

            // draws the left score box
            Helpers.drawWindow(ctx, this.x - boxWidth - 50, this.y + fieldHeight / 2 - boxHeight / 2, boxWidth, boxHeight, function () {
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
                let scoreText = m_score.toString();
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
                let linesText = m_lines.toString();
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
                let levelText = m_level.toString();
                let levelWidth = ctx.measureText(levelText).width;
                ctx.translate(boxWidth - 8 - levelWidth, 4 + Constants.SCORE_FONT_SIZE * 8);
                drawGradientText(levelText, levelWidth, Constants.SCORE_FONT_SIZE);
                ctx.restore();
            });

            // draws the righthand next piece box
            if (m_nextPiece) {
                boxWidth = 144;
                boxHeight = 150;
                Helpers.drawWindow(ctx, this.x + 50 + fieldWidth, this.y + fieldHeight / 2 - boxHeight / 2, boxWidth, boxHeight, function () {
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
                    if (g_pauseMode == 0) {
                        let offsetX = 24;
                        let offsetY = Constants.SCORE_FONT_SIZE * 2;

                        // fiddle with the piece offset for certain types of pieces
                        switch (m_nextPiece.typeIndex) {
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
                        m_nextPiece.draw(ctx, Constants.CELL_SIZE, false, offsetX, offsetY);
                    }
                });
            }
        };

        // returns the Piece that is currently falling
        this.getActivePiece = function () {
            return m_activePiece;
        };

        // gets the collection of Cells for this Field
        this.getCells = function () {
            return m_cells;
        };

        // returns an object containing the current score, level, and line cont
        this.getScoreData = function () {
            return { score: m_score, level: m_level, lines: m_lines };
        };

        // performs a hard drop (piece is dropped until it collides)
        this.hardDrop = function () {
            // keep track of how far the piece fell
            let dropCount = 0;

            // ignore input during replays
            if (m_replayMode) {
                return;
            }

            // keep moving piece down until it collides
            while (!this.doesPieceCollide(m_activePiece, 0 /*dx*/, 1 /*dy*/)) {
                m_activePiece.cellY++;
                dropCount++;
            }

            // did piece even fall at all?
            if (dropCount > 0) {
                // send Piece update to server
                this.handlePieceUpdate();

                // increment score for hard drop times the number of lines it fell
                m_score += dropCount * Constants.SCORE_HARD_DROP;

                // reset the time until the piece is dropped due to gravity (this is probably unnecessary since we're already at the bottom but whatever)
                m_activePieceFallTime = 0;

                // hard drop locks the piece instantly
                m_activePieceLockTime = 0;
            }
        };

        // tries to shift the piece left
        this.moveLeft = function () {
            // ignore input during replays
            if (m_replayMode) {
                return;
            }

            // if there's room for it, move the piece left
            if (!this.doesPieceCollide(m_activePiece, -1 /*dx*/)) {
                m_activePiece.cellX--;

                // moving pieces resets the piece lock delay
                m_activePieceLockTime = Constants.LOCK_DELAY;

                // send Piece update to the server
                this.handlePieceUpdate();

                Helpers.playSound(g_soundShift);
            }
        };

        // tries to shift the piece right
        this.moveRight = function () {
            // ignore input during replays
            if (m_replayMode) {
                return;
            }

            // if there's room for it, move the piece right
            if (!this.doesPieceCollide(m_activePiece, 1 /*dx*/)) {
                m_activePiece.cellX++;

                // moving pieces resets the piece lock delay
                m_activePieceLockTime = Constants.LOCK_DELAY;

                // send Piece update to the server
                this.handlePieceUpdate();

                Helpers.playSound(g_soundShift);
            }
        };

        // tries to rotate the piece
        this.rotate = function () {
            // ignore input during replays
            if (m_replayMode) {
                return;
            }

            // tests if piece collides after rotation
            if (!this.doesPieceCollide(m_activePiece, 0 /*dx*/, 0 /*dy*/, 1 /*drotation*/)) {
                // rotation is wraped between 0 and 4
                m_activePiece.rotation = (m_activePiece.rotation + 1) % 4;

                // rotating resets the lock delay
                m_activePieceLockTime = Constants.LOCK_DELAY;

                // send updated rotation to the server
                this.handlePieceUpdate();
                Helpers.playSound(g_soundRotate);
            }
            else if (m_activePiece) {
                // test for wall kicks, allows the piece to be shifted in location slightly to permit the rotation to happen

                // for "I" shaped pieces, use a special lookup table
                let wallKickTable = (m_activePiece.typeIndex == 0) ? g_wallKickTableAlt : g_wallKickTable;

                // get the appropiate wall kick table for the current rotation
                let stepTable = wallKickTable[m_activePiece.rotation];

                // each rotation tests for 4 possible steps
                for (let step = 0; step < 4; step++) {
                    // each step has a X and Y offset
                    let offsetX = stepTable[step][0];
                    let offsetY = stepTable[step][1];

                    // apply the offsets to the rotation collision test and see if it works
                    if (!this.doesPieceCollide(m_activePiece, offsetX /*dx*/, offsetY /*dy*/, 1 /*drotation*/)) {
                        // wall kick is allowed, apply the appropiate location shift and new rotation
                        m_activePiece.rotation = (m_activePiece.rotation + 1) % 4;
                        m_activePiece.cellX += offsetX;
                        m_activePiece.cellY += offsetY;

                        // rotation always resets the lock delay
                        m_activePieceLockTime = Constants.LOCK_DELAY;

                        // send updated location/rotation to the server
                        this.handlePieceUpdate();
                        Helpers.playSound(g_soundRotate);
                        break;
                    }
                }
            }
        };

        // performs a "soft drop" of a single row for the current piece
        this.softDrop = function () {
            // ignore input during replays
            if (m_replayMode) {
                return;
            }

            // test for collision
            if (!this.doesPieceCollide(m_activePiece, 0 /*dx*/, 1 /*dy*/)) {
                m_activePiece.cellY++;

                // reset the time to next "auto-drop" time due to gravity
                m_activePieceFallTime = 0;

                // increment score for each row the user drops the piece
                m_score += Constants.SCORE_SOFT_DROP;

                // soft dropping a piece resets the lock delay
                m_activePieceLockTime = Constants.LOCK_DELAY;

                // notify server of new Piece location
                this.handlePieceUpdate();
                Helpers.playSound(g_soundShift);
            }
        };

        // performs physics updates for the Field, animations, and plays back the Replay (if active)
        this.update = function (step) {
            // are we running a replay?
            if (m_replayMode && !m_loadingReplay) {

                // run the replay until out of instructions
                if (m_replayIndex < m_replayInstructions.length) {

                    // increment time the replay has been running
                    m_replayTime += step;

                    // run instructions until we're past the current m_replayTime or out of instructions
                    for (let len = m_replayInstructions.length; m_replayIndex < len; m_replayIndex++) {
                        // fetch a new replay instruction
                        let nextInstruction = m_replayInstructions[m_replayIndex];

                        // run instructions as long as its within m_replayTime
                        if (nextInstruction.timestamp <= m_replayTime) {
                            if (nextInstruction.typeIndex === -1) {
                                // instruction is clearing the piece
                                m_activePiece = null;
                            }
                            else if (typeof nextInstruction.typeIndex != "undefined") {
                                // instruction is updating the current Piece location or rotation, or creating a new Piece
                                if (m_activePiece == null) {
                                    m_activePiece = new Piece(undefined);
                                }
                                m_activePiece.typeIndex = nextInstruction.typeIndex;
                                m_activePiece.cellX = nextInstruction.x;
                                m_activePiece.cellY = nextInstruction.y;
                                m_activePiece.rotation = nextInstruction.rotation;
                                m_activePieceFallTime = 0;
                                m_activePieceLockTime = Constants.LOCK_DELAY;
                                this.updateGhostPiece();
                            }
                            else if (nextInstruction.cells) {
                                // instruction is updating the Field state (cells and score, etc)
                                m_cells = nextInstruction.cells;
                                m_score = nextInstruction.score;
                                m_lines = nextInstruction.lines;
                                m_level = nextInstruction.level;
                                m_fallSpeed = Constants.LEVEL_SPEEDS[m_level - 1];
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
            if (m_gameOver) {
                m_gameOverTextBounce += m_gameOverTextBounceStep
                if (m_gameOverTextBounce > 4) {
                    m_gameOverTextBounce = 4;
                    m_gameOverTextBounceStep = -m_gameOverTextBounceStep;
                }
                else if (m_gameOverTextBounce < -4) {
                    m_gameOverTextBounce = -4;
                    m_gameOverTextBounceStep = -m_gameOverTextBounceStep;
                }

                // stop doing any physics processing on the Field
                return; // early return
            }

            // if there's rows that need to be cleared, run the clear animation
            if (m_rowsToClear && m_rowsToClear.length > 0) {
                // when time is 0, the animation is finished
                m_rowClearTime -= step;

                // normalizes the animation time from 0 to 1, when it hits 1 the animation is finished
                let normalizedClearTime = 1 - m_rowClearTime / Constants.FIELD_ROW_CLEAR_TIME

                // when the animation is finished, rows above the cleared lines will fall down
                let linesCleared = 0;
                if (normalizedClearTime >= 1) {
                    for (let i = 0; i < m_rowsToClear.length; i++) {
                        let y = m_rowsToClear[i] + i;
                        for (let y2 = y; y2 >= 0; y2--) {
                            for (let x = 0; x < Constants.FIELD_COLUMN_COUNT; x++) {
                                if (y2 > 0) {
                                    m_cells[y2 * Constants.FIELD_COLUMN_COUNT + x] = m_cells[(y2 - 1) * Constants.FIELD_COLUMN_COUNT + x];
                                } else {
                                    m_cells[y2 * Constants.FIELD_COLUMN_COUNT + x] = 0;
                                }
                            }
                        }
                        y++;
                        linesCleared++;
                    }

                    // animation is complete and rows have fallen, send update to the server about this
                    m_rowsToClear = [];
                    this.handleFieldUpdate();

                    // clearing lines adds to score
                    if (linesCleared > 0) {
                        m_lines += linesCleared;

                        switch (linesCleared) {
                            case 1:
                                m_score += Constants.SCORE_SINGLE_LINES * m_level;
                                break;
                            case 2:
                                m_score += Constants.SCORE_DOUBLE_LINES * m_level;
                                break;
                            case 3:
                                m_score += Constants.SCORE_TRIPLE_LINES * m_level;
                                break;
                            case 4:
                                m_score += Constants.SCORE_TETRIS_LINES * m_level;
                                break;
                        }
                    }

                    // increment level if needed
                    let newLevel = Math.floor((m_lines + Constants.LINES_PER_LEVEL) / Constants.LINES_PER_LEVEL);
                    if (newLevel > Constants.MAX_LEVEL) {
                        newLevel = Constants.MAX_LEVEL;
                    }
                    if (newLevel > m_level) {
                        // level was changed, get the new falling speed and start the background warp effect
                        m_level = newLevel;
                        m_fallSpeed = Constants.LEVEL_SPEEDS[m_level - 1];
                        startWarpEffect();
                    }
                }
                else {
                    // play the row clearing animation, it will clear cells starting at the center of the row, and working to the edges
                    let cellsRemoved = Math.round((Constants.FIELD_COLUMN_COUNT / 2) * normalizedClearTime);
                    for (let x = 0; x < cellsRemoved; x++) {
                        let leftCol = Constants.FIELD_COLUMN_COUNT / 2 - x - 1;
                        let rightCol = Constants.FIELD_COLUMN_COUNT / 2 + x;

                        for (let rowIndex = 0; rowIndex < m_rowsToClear.length; rowIndex++) {
                            let y = m_rowsToClear[rowIndex];
                            m_cells[leftCol + y * Constants.FIELD_COLUMN_COUNT] = 0;
                            m_cells[rightCol + y * Constants.FIELD_COLUMN_COUNT] = 0;
                        }
                    }
                }
            }

            if (m_activePiece == null) {
                // need a new piece
                if (!m_replayMode && m_rowClearTime <= 0) {
                    /// ...but not until all the pending rows are cleared
                    m_activePieceLockTime = Constants.LOCK_DELAY;
                    m_activePiece = m_nextPiece;
                    m_nextPiece = new Piece(m_pieceBag.getNewPieceType());

                    // if no room for a new piece, then it's game over
                    if (this.doesPieceCollide(m_activePiece)) {
                        m_gameOver = true;
                        m_activePiece = null;
                        Helpers.playSound(g_soundGameOver);
                    }
                    else {
                        // notify server about the new piece
                        this.handlePieceUpdate();
                    }
                }
            }
            else if (this.doesPieceCollide(m_activePiece, 0 /*dx*/, 1 /*dy*/)) {
                // if piece is about to land

                // countdown to lock time
                m_activePieceLockTime -= step;
                if (m_activePieceLockTime <= 0) {
                    // lock the piece to field
                    mergeActivePiece();

                    // play hit sound
                    Helpers.playSound(g_soundHit);

                    // there is no longer an active piece
                    m_activePiece = null;

                    // send new Field state to the server
                    this.handlePieceUpdate();
                    this.handleFieldUpdate();

                    // locking piece may have triggered line clear
                    for (let y = Constants.FIELD_ROW_COUNT - 1; y >= 0; y--) {
                        let lineFull = true;

                        for (let x = 0; x < Constants.FIELD_COLUMN_COUNT; x++) {
                            if (m_cells[y * Constants.FIELD_COLUMN_COUNT + x] == 0) {
                                lineFull = false;
                                break;
                            }
                        }

                        if (lineFull) {
                            // schedule this row index for clearing
                            m_rowsToClear.push(y);
                            m_rowClearTime = Constants.FIELD_ROW_CLEAR_TIME;
                        }
                    }

                    if (m_rowClearTime == Constants.FIELD_ROW_CLEAR_TIME) {
                        Helpers.playSound(g_soundClear);
                    }
                }
            }
            else {
                // apply piece falling
                m_activePieceFallTime += step;
                if (m_activePieceFallTime >= m_fallSpeed) {
                    if (!this.doesPieceCollide(m_activePiece, 0 /*dx*/, 1 /*dy*/)) {
                        m_activePieceFallTime = 0;
                        m_activePiece.cellY++;
                        m_activePieceLockTime = Constants.LOCK_DELAY;
                    }
                }
            }
        };

        // initializes a newly created Field
        function init() {
            // cells are initially 0
            let cellCount = Constants.FIELD_COLUMN_COUNT * Constants.FIELD_ROW_COUNT;
            for (let i = 0; i < cellCount; i++) {
                m_cells[i] = 0;
            }
            m_fallSpeed = Constants.LEVEL_SPEEDS[m_level - 1];
            m_pieceBag = new PieceBag();
            m_nextPiece = new Piece(m_pieceBag.getNewPieceType());
        }

        // locks the active piece to the Field by merging it with the cells collection
        function mergeActivePiece() {
            if (m_activePiece == null) {
                return;
            }

            let pieceCells = m_activePiece.getCells();

            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 4; x++) {
                    let cell = pieceCells[y * 4 + x];

                    if (cell != 0) {
                        let cellX = m_activePiece.cellX + x;
                        let cellY = m_activePiece.cellY + y;
                        let cellIndex = cellY * Constants.FIELD_COLUMN_COUNT + cellX;
                        m_cells[cellIndex] = cell;
                    }
                }
            }
        }

        // sends the current Field state to the server
        this.handleFieldUpdate = function () {
            if (!g_offlineMode && g_activeConnection && (this == g_activeField)) {
                g_activeConnection.handleFieldUpdate();
            }
        };

        // sends the state of the active Piece to the server
        this.handlePieceUpdate = function () {
            if (!g_offlineMode && g_activeConnection && (this == g_activeField)) {
                g_activeConnection.handlePieceUpdate();
            }
            this.updateGhostPiece();
        };

        // loads a replay with the requested ID from the server, and starts playback
        this.playReplay = function (replayID) {
            m_replayMode = true;

            // set initial Field state for replay playback
            let cellCount = Constants.FIELD_COLUMN_COUNT * Constants.FIELD_ROW_COUNT;
            for (let i = 0; i < cellCount; i++) {
                m_cells[i] = 0;
            }
            m_activePiece = null;
            m_nextPiece = null;
            m_ghostPiece = null;
            m_score = 0;
            m_level = 1;
            m_lines = 0;
            m_fallSpeed = Constants.LEVEL_SPEEDS[m_level - 1];

            // now waiting on the server for replay data
            m_loadingReplay = true;

            // do XHR request for the replay data
            let request = new XMLHttpRequest();
            //request.open("GET", "http://localhost:17100/api/Tetris/GetReplayInstructions/" + replayID, true);
            request.open("GET", "http://elihome.net/api/Tetris/GetReplayInstructions/" + replayID, true);
            request.onreadystatechange = function (evt) {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        // request returned data, parse instruction array and start the replay
                        m_replayInstructions = JSON.parse(request.responseText);
                        m_loadingReplay = false;
                        m_replayTime = 0;
                        m_replayIndex = 0;
                    }
                    // TODO: Error handle
                }
            };
            request.send(null);
        };

        // updates the location of the ghost piece
        this.updateGhostPiece = function () {
            if (m_activePiece == null) {
                m_ghostPiece = null;
            }
            else {
                m_ghostPiece = new Piece(undefined);
                m_ghostPiece.typeIndex = m_activePiece.typeIndex;
                m_ghostPiece.cellX = m_activePiece.cellX;
                m_ghostPiece.cellY = m_activePiece.cellY;
                m_ghostPiece.rotation = m_activePiece.rotation;

                while (!this.doesPieceCollide(m_ghostPiece, 0, 1)) {
                    m_ghostPiece.cellY++;
                }
            }
        };

        init();
    };

    //
    // Helpers
    //
    let Helpers = <any>{};
    // draws a window with rounded borders, optionally specify a drawFunc to draw the window contents within its bounds
    Helpers.drawWindow = function (ctx, x, y, width, height, drawFunc) {
        ctx.save();

        // translate the border and window contents (drawFunc) to the location of the window in the canvas
        ctx.translate(x, y);

        let cornerRadius = 8;

        ctx.strokeStyle = "#FFF";
        ctx.beginPath();
        ctx.moveTo(cornerRadius, 0);
        ctx.arcTo(width, 0, width, cornerRadius, cornerRadius);
        ctx.arcTo(width, height, width - cornerRadius, height, cornerRadius);
        ctx.arcTo(0, height, 0, -cornerRadius, cornerRadius);
        ctx.arcTo(0, 0, cornerRadius, 0, cornerRadius);

        ctx.lineWidth = 4;
        ctx.stroke();

        if (drawFunc) {
            drawFunc(ctx);
        }

        ctx.restore();
    };
    Helpers.getRand = function (min, max) {
        return Math.random() * (max - min) + min;
    };
    Helpers.getRandInt = function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    // returns the current location query string as a collection of key-value pairs
    Helpers.getQueryStringAsDictionary = function () {
        let dict = {};
        let query = window.location.search.substring(1);
        let pairs = query.split("&");
        for (let i = 0, len = pairs.length; i < len; i++) {
            let pair = pairs[i].split("=");
            let key = pair[0];
            let value = pair[1];
            dict[key] = value;
        }
        return dict;
    };

    Helpers.playSound = function (sound) {
        if (!sound || !sound.buffered) {
            // sound isn't ready, don't play
            return;
        }

        if (!g_enableAudio || window.location.hash == "#mute") {
            return;
        }

        let now = (new Date()).getTime();
        for (let i = 0; i < g_audioChan.length; i++) {
            let audioChan = g_audioChan[i];
            if (audioChan.finished < now) {
                let dur = sound.duration;
                if (dur == NaN) {
                    dur = 0.4;
                }

                audioChan.finished = now + dur * 1000;
                audioChan.channel.src = sound.src;
                audioChan.channel.load();
                audioChan.channel.play();
                break;
            }
        }
    };

    //
    // Piece
    // Stores the state of a game Piece (i.e. it's type, position, rotation)
    //
    let Piece = function (type) {
        // the type of piece
        this.typeIndex = type;

        // the cell location of the piece within a Field
        this.cellX = 0;
        this.cellY = 0;

        // the rotation state of the piece (0-3)
        this.rotation = 0;

        // used for smooth piece falling (not supported anymore)
        this.offsetY = 0;

        // renders the piece using the specified canvas 2D context, cellScale is the width/height in pixels of each cell in the Piece,
        // highlight to true will draw the piece with slightly brighter colors than normal, specify x/y will translate the Piece by so many pixels
        this.draw = function (ctx, cellScale, highlight, x, y) {
            ctx.save();

            if (typeof y != "undefined") {
                ctx.translate(x, y);
            }
            else {
                ctx.translate(this.cellX * cellScale, (this.cellY - Constants.FIELD_HIDDEN_ROW_COUNT) * cellScale);
            }

            let pieceCells = this.getCells();

            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 4; x++) {
                    let cell = pieceCells[(y * 4) + x];
                    if (cell != 0) {
                        let finalX = Math.floor(x * cellScale)
                        let finalY = Math.floor(y * cellScale + this.offsetY);

                        drawCellFromStrip(ctx, finalX, finalY, cell, cellScale);

                        if (highlight) {
                            ctx.save();
                            ctx.globalAlpha = 0.25;
                            ctx.fillStyle = "#FFF";
                            ctx.fillRect(finalX, finalY, cellScale, cellScale);
                            ctx.restore();
                        }
                    }
                }
            }

            ctx.restore();
        };

        // returns a collection of Cells that makeup this piece
        this.getCells = function () {
            return g_pieces[this.typeIndex][this.rotation];
        };

        // returns the tight cell bounds (width/height) of the piece
        this.getSize = function () {
            let width = 0;
            let height = 0;
            let pieceCells = this.getCells();

            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 4; x++) {
                    let cell = pieceCells[(y * 4) + x];
                    if (cell != 0) {
                        height++;
                        break;
                    }
                }
            }
            for (let x = 0; x < 4; x++) {
                for (let y = 0; y < 4; y++) {
                    let cell = pieceCells[(y * 4) + x];
                    if (cell != 0) {
                        width++;
                        break;
                    }
                }
            }

            return { width: width, height: height };
        }

        this.init = function () {
            this.typeIndex = Helpers.getRandInt(0, g_pieces.length - 1);
            this.cellX = Constants.FIELD_COLUMN_COUNT / 2 - 2;
        };

        this.init();
    };

    //
    // PieceBag
    //
    let PieceBag = function() {
        let m_contents = [];
        let m_index = 0;

        initialize();

        this.getNewPieceType = function() {
            let result = m_contents[m_index];
            m_index++;

            if (m_index >= m_contents.length) {
                initialize();
            }

            return result;
        }

        function initialize() {
            m_contents = shuffle([0, 1, 2, 3, 4, 5, 6]);
            m_index = 0;
        }

        function shuffle(array) {
            let counter = array.length, temp, index;

            while (counter > 0) {
                // choose random index
                index = Math.floor(Math.random() * counter);

                counter--;

                // swap indices
                temp = array[counter];
                array[counter] = array[index];
                array[index] = temp;
            }

            return array;
        }
    }

    //
    // ServerConnection
    //
    let ServerConnection = function () {
        let m_socket = null;

        // established a WebSocket connection at the specified URL
        this.connect = function (url) {
            if (!g_offlineMode && ("WebSocket" in window)) {
                m_socket = new WebSocket(url);

                m_socket.onopen = this.onSocketOpen;
                m_socket.onmessage = this.onSocketMessage;
                m_socket.onclose = this.onSocketClose;
                m_socket.onerror = this.onSocketError;
            }
            else {
                // WebSockets aren't supported so just go to offline mode
                g_offlineMode = true;
            }
        };

        this.disconnect = function () {
            if (m_socket) {
                m_socket.close();
            }
        };

        this.isOpen = function () {
            if (m_socket) {
                return (m_socket.readyState === 1);
            }
            return false;
        };

        this.onSocketOpen = function () {

        };

        this.onSocketMessage = function (evt) {
            if (typeof evt.data == "string") {
                let msg = null;
                try {
                    msg = JSON.parse(evt.data);
                }
                catch (e) {
                }
                if (msg) {
                    // log server traffic to the console
                    console.log("S->C: [" + msg.Type + "]: '" + msg.Data + "'");

                    // responds to heartbeats from the server
                    switch (msg.Type) {
                        case "PING":
                            sendMessage("PONG", msg.Data);
                            break;
                    }
                }
            }
        };

        this.onSocketClose = function (evt) {

        };

        this.onSocketError = function () {

        };

        // sends updated Field state to the server
        this.handleFieldUpdate = function () {
            let scoreData = g_activeField.getScoreData();
            let fieldUpdateData = {
                timestamp: g_elapsedTime,
                cells: g_activeField.getCells(),
                score: scoreData.score,
                lines: scoreData.lines,
                level: scoreData.level
            };
            sendMessage("FIELD_UPDATE", JSON.stringify(fieldUpdateData));
        };

        // sends updated Piece state to the server
        this.handlePieceUpdate = function () {
            let activePiece = g_activeField.getActivePiece();
            let pieceUpdateData;

            if (activePiece) {
                pieceUpdateData = {
                    timestamp: g_elapsedTime,
                    typeIndex: activePiece.typeIndex,
                    x: activePiece.cellX,
                    y: activePiece.cellY,
                    rotation: activePiece.rotation
                };
            }
            else {
                // empty pieces just set everything to a magic number (-1)
                pieceUpdateData = {
                    timestamp: g_elapsedTime,
                    typeIndex: -1,
                    x: -1,
                    y: -1,
                    rotation: -1
                };
            }
            sendMessage("PIECE_UPDATE", JSON.stringify(pieceUpdateData));
        };

        // encodes a message for transit through the WebSocket
        function sendMessage(type, data) {
            let logPrefix = "";

            if (m_socket && m_socket.readyState === 1) {
                m_socket.send(JSON.stringify({ Type: type, Data: data }));
            }
            else {
                logPrefix = "DROPPED ";
            }

            console.log(logPrefix + "C->S: [" + type + "]: '" + data + "'");
        };
    };

    // entry point
    function main() {
        window.requestAnimationFrame = window.requestAnimationFrame || window['mozRequestAnimationFrame'] || window['webkitRequestAnimationFrame'] || window['msRequestAnimationFrame'];

        g_canvas = document.getElementById("canvasMain");
        if (g_canvas) {
            window.addEventListener("resize", resizeCanvas);
            window.addEventListener("keydown", handleKeyDown);
            window.addEventListener("keyup", handleKeyUp);
            window.addEventListener("focusin", handleFocusIn);
            window.addEventListener("focusout", handleFocusOut);
            window.addEventListener("hashchange", resetGame);

            resetGame();

            // load image resources from the server
            let img = new Image();
            img.onload = function () {
                g_cellStripImage = img;
            };
            img.src = "img/tetris_cells.png";

            let imgVortex = new Image();
            imgVortex.onload = function () {
                g_vortexImage = imgVortex;
            };
            imgVortex.src = "img/vortex.png";

            let starImage = new Image();
            starImage.onload = function () {
                g_starImage = starImage;
            };
            starImage.src = "img/star.png";


            // initialize audio channels
            g_audioChan = [];
            for (let i = 0; i < Constants.MAX_AUDIO_CHANELS; i++) {
                g_audioChan[i] = {
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
            g_soundRotate = loadAudio("audio/shift.mp3");
            g_soundHit = loadAudio("audio/hit.mp3");
            g_soundShift = loadAudio("audio/shift.mp3");
            g_soundClear = loadAudio("audio/clear.mp3");
            g_soundWarp = loadAudio("audio/warp.mp3");
            g_soundGameOver = loadAudio("audio/gameover.mp3");
            g_soundPause = loadAudio("audio/pause.mp3");

            resetStars();

            resizeCanvas();
            drawFrame(0);
        }
    }

    // draws the vortex and star effects, upon level transition a specific space warp animation runs and is drawn here
    function drawBackground(ctx, step) {
        ctx.save();

        // clear the whole drawing area to a solid color
        ctx.fillStyle = Constants.BACKGROUND_COLOR;
        ctx.fillRect(0, 0, g_width, g_height);

        // set origin to the center of the drawing area
        ctx.translate(g_width / 2, g_height / 2);

        // normalize the warp time animation from 0 to 1 (animation is finished when it hits 1)
        let warpTimeNormalized = 1 - (g_warpTime / Constants.WARP_TIME);

        // calculate the size of the background effect (the smallest of the two dimensions that make up the drawing area)
        let minDim = Math.min(g_width, g_height);

        if ((g_warpTime > 0) && (warpTimeNormalized < 0.9)) {
            // the last 10% of the warp animation will scale down the background, which creates an impression that we're flying away from it
            minDim *= 1 - warpTimeNormalized;
        }

        // if the vortex image was loaded from the server, scale and rotate it, then draw
        if (g_vortexImage) {
            ctx.save();
            ctx.scale(minDim / 512, minDim / 512);
            ctx.rotate(g_vortexSpin)
            ctx.drawImage(g_vortexImage, -256, -256);
            ctx.restore();
        }

        // if star image was loaded from the server, draw the star particles
        if (g_starImage) {
            for (let i = 0, len = g_stars.length; i < len; i++) {
                let star = g_stars[i];
                ctx.save();
                ctx.rotate(g_vortexSpin);
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
                ctx.drawImage(g_starImage, -32, -32);

                ctx.restore();

                if (g_warpStarGravity) {
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
                    let angle = Helpers.getRand(0, 2 * Math.PI);
                    star.x = 0;
                    star.y = 0;
                    star.scale = Helpers.getRand(0.1, 0.5); // random size
                    star.dx = Math.cos(angle); // direction vector X component
                    star.dy = Math.sin(angle); // direction vector Y component
                    star.life = 0;
                }
            }
        }

        // if this is non-zero, the warp animation is running
        if (g_warpTime > 0) {
            // define a radial gradient that is used to color the streak particles
            let streakGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 512);
            streakGradient.addColorStop(0, "rgb(3, 9, 255)");
            streakGradient.addColorStop(0.5, "rgb(64, 255, 255)");
            streakGradient.addColorStop(1, "rgb(3, 9, 255)");

            // draw streak particles during the first 90% of the animation time
            if (warpTimeNormalized < 0.9) {
                for (let i = 0, len = g_warpStreaks.length; i < len; i++) {
                    let streak = g_warpStreaks[i];

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
                    if ((Math.abs(streak.x) > g_width / 2) || (Math.abs(streak.y) > g_height / 2)) {
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
                    if (g_warpStarGravity) {
                        // reset stars back to normal locations so they're not clumped together
                        resetStars();
                        g_warpStarGravity = false;
                    }

                    // animate fading back in for the last 10% of the warp animation
                    ctx.globalAlpha = (1 - warpTimeNormalized) * 10;
                }

                // render the white fade-out effect
                ctx.fillStyle = Constants.WHITE_FADER_COLOR;
                ctx.fillRect(-g_width / 2, -g_height / 2, g_width, g_height);
                ctx.restore();
            }

            // animation time is counting down to 0
            g_warpTime -= step;
        };

        ctx.restore();

        // adjust vortex spin rate during the warp animatino
        let spinSpeed = 0.05;
        if ((g_warpTime > 0) && (warpTimeNormalized < 0.9)) {
            spinSpeed = 0.1 + warpTimeNormalized * 0.4;
        }

        g_vortexSpin += step * spinSpeed;
    }

    // draws a cell on the screen at the specified pixel location
    function drawCellFromStrip(ctx, x, y, cellColor, cellScale) {
        if (g_cellStripImage) {
            let offset = g_cellStripOffset[cellColor];

            ctx.drawImage(g_cellStripImage, offset, 0, Constants.CELL_SIZE, Constants.CELL_SIZE, x, y, cellScale, cellScale);
        }
    }

    // called when the browser wants to render a new animation frame
    function drawFrame(frameTime) {
        window.requestAnimationFrame(drawFrame);

        let ctx = g_canvas.getContext("2d");
        if (!ctx || (typeof frameTime === "undefined")) {
            return;
        }

        // calculate number of seconds elapsed since last frame
        let step = (frameTime - g_lastFrameTime) / 1000;
        g_lastFrameTime = frameTime;

        // run game logic for elapsed time
        runGame(step);

        // set to identity matrix
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(g_scaleX, g_scaleY);

        // render the game background effects
        drawBackground(ctx, step);

        // if paused, render the pause text
        if (g_pauseMode > 0) {
            ctx.save();
            ctx.font = Constants.PAUSE_FONT;
            let pauseWidth = ctx.measureText("PAUSE").width;
            let textX = g_width / 2 - pauseWidth / 2;
            let textY = g_height / 2 + Constants.PAUSE_FONT_SIZE / 2 - 16;

            let scale = Math.sin(g_pauseTextPulse * 10) * 0.05 + 1;
            g_pauseTextPulse += step;

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
            for (let i = 0, len = g_fields.length; i < len; i++) {
                let field = g_fields[i];
                field.draw(ctx);
            }
        }

        // render the active field's score boxes
        if (g_activeField) {
            g_activeField.drawScore(ctx);
        }

        // draw any status text overlay
        drawStatusText(ctx);
    }

    // render text on top of the display
    function drawStatusText(ctx) {
        if (g_statusText) {
            ctx.save();

            ctx.font = "24px Arial";
            let metrics = ctx.measureText(g_statusText);
            let x = Math.floor(g_width / 2 - metrics.width / 2);
            let y = Math.floor(g_height / 2 - 24 / 2);

            ctx.fillStyle = "rgba(0, 32, 64, 0.5)"
            ctx.fillRect(0, y - 30, g_width, 48);

            ctx.fillStyle = "rgb(255, 255, 255)";
            ctx.fillText(g_statusText, x, y);

            ctx.restore();
        }
    }

    // browser window got focus
    function handleFocusIn(e) {
        e = e || window.event;

        g_keyState = {};

        //g_pauseMode--;
    }

    // browser window lost focus
    function handleFocusOut(e) {
        e = e || window.event;

        g_keyState = {};
        //g_pauseMode++;
    }

    // user started pushing a key
    function handleKeyDown(e) {
        e = e || window.event;

        // start keeping track of keys that are pressed
        if (!g_keyState[e.keyCode]) {

            g_keyState[e.keyCode] = {
                pressed: true,
                duration: 0,
                repeatStep: 0
            };

            // do any events for the key press
            handleKeyPress(e.keyCode);
        }
    }

    // user stopped pushing a key
    function handleKeyUp(e) {
        e = e || window.event;

        // mark key as no longer pressed
        g_keyState[e.keyCode] = null;
    }

    function handleKeyPress(keyCode) {
        switch (keyCode) {
            case 27: // ESC
                g_userPauseMode = !g_userPauseMode;
                g_pauseMode += g_userPauseMode ? 1 : -1;
                Helpers.playSound(g_soundPause);
                break;
            case 32: // space
                g_activeField.hardDrop();
                break;
            case 37: // left
                g_activeField.moveLeft();
                break;
            case 38: // up
                g_activeField.rotate();
                break;
            case 39: // right
                g_activeField.moveRight();
                break;
            case 40: // down
                g_activeField.softDrop();
                break;
                //case 87: // 'w'
                //startWarpEffect();
                //break;
        }
    }

    // periodically check to see if keys are still pressed, and trigger events if they repeat
    function updateInputState(step) {
        g_timeMultiply = 1;

        for (let prop in g_keyState) {
            let key = g_keyState[prop];
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
                            handleKeyPress(keyCode);
                        }
                    }
                }

                // debug key, when ~ is pushed, speed up time
                if (keyCode == 192) {
                    g_timeMultiply = 10;
                }
            }
        }
    }

    function resetGame() {
        g_fields = [];

        g_activeField = new Field();
        g_fields.push(g_activeField);

        let query = Helpers.getQueryStringAsDictionary();
        if (query["ReplayID"]) {
            g_offlineMode = true;
            let replayID = query["ReplayID"];
            if (replayID) {
                g_activeField.playReplay(replayID);
            }
        }
        else {
            g_activeConnection = new ServerConnection();
            g_activeConnection.connect("ws://elihome.net/api/Tetris")
            //g_activeConnection.connect("ws://localhost:17100/api/Tetris")
        }

        /*
        if (window.location.hash == "#multifield") {
            g_fields.push(new Field());
            g_fields.push(new Field());
            g_fields.push(new Field());
        }
        */

        resizeCanvas();
    }

    function resetStars() {
        g_stars = [];
        for (let i = 0; i < Constants.STAR_COUNT; i++) {
            let angle = Helpers.getRand(0, 2 * Math.PI);
            let dx = Math.cos(angle);
            let dy = Math.sin(angle);
            let newStar = {
                x: 0,
                y: 0,
                dx: dx, // direction vector X component
                dy: dy, // direction vector Y component
                scale: Helpers.getRand(0.1, 0.5),
                speed: Helpers.getRand(1.0, 2.5),
                life: 0
            };

            // stars spawn at a random place along their life span so they're not all clumped together at the center
            let life = Helpers.getRand(0, Constants.STAR_LIFESPAN);
            newStar.x += dx * life * Constants.STAR_SPEED;
            newStar.y += dy * life * Constants.STAR_SPEED;
            newStar.life = life;

            g_stars.push(newStar);
        }
    }

    function resizeCanvas() {
        if (g_canvas) {
            g_width = window.innerWidth;
            g_height = g_width * (Constants.FIXED_HEIGHT / Constants.FIXED_WIDTH);

            if (g_height > window.innerHeight) {
                g_height = window.innerHeight;
                g_width = g_height * (Constants.FIXED_WIDTH / Constants.FIXED_HEIGHT)
            }

            g_canvas.width = g_width;
            g_canvas.height = g_height;
            g_canvas.style.width = g_width + "px";
            g_canvas.style.height = g_height + "px";
            g_canvas.style.position = "absolute";
            g_canvas.style.left = (window.innerWidth / 2 - g_width / 2) + "px";
            g_canvas.style.top = (window.innerHeight / 2 - g_height / 2) + "px";

            if (g_activeField) {
                g_activeField.cellScale = Constants.CELL_SIZE;
                let fieldWidth = Constants.FIELD_COLUMN_COUNT * g_activeField.cellScale;
                let fieldHeight = (Constants.FIELD_ROW_COUNT - Constants.FIELD_HIDDEN_ROW_COUNT) * g_activeField.cellScale;
                //if ((g_width < fieldWidth) || (g_height < fieldHeight)) {
                //g_activeField.cellScale = 16;
                //}
                //fieldWidth = Constants.fieldColumnCount * g_activeField.cellScale;
                //fieldHeight = (Constants.fieldRowCount - Constants.fieldHiddenRowCount) * g_activeField.cellScale;
                g_scaleX = g_width / Constants.FIXED_WIDTH;
                g_scaleY = g_height / Constants.FIXED_HEIGHT;
                g_width = Constants.FIXED_WIDTH;
                g_height = Constants.FIXED_HEIGHT;

                if (window.location.hash == "#multifield") {
                    for (let i = 0, len = g_fields.length; i < len; i++) {
                        let field = g_fields[i];
                        field.x = 200 * i + 100;
                        field.y = 100;
                        field.cellScale = 16;
                    }
                }
                else {
                    g_activeField.x = g_width / 2 - fieldWidth / 2;
                    g_activeField.y = g_height / 2 - fieldHeight / 2;
                }
            }
        }
    }

    function runGame(step) {
        g_stepTime += step;

        while (g_stepTime > Constants.TIME_STEP) {
            g_stepTime -= Constants.TIME_STEP;

            updateInputState(Constants.TIME_STEP);

            if (g_offlineMode || (g_activeConnection && g_activeConnection.isOpen())) {
                g_statusText = "";

                if (g_pauseMode == 0) {
                    g_elapsedTime += Constants.TIME_STEP;

                    for (let i = 0, len = g_fields.length; i < len; i++) {
                        let field = g_fields[i];
                        field.update(Constants.TIME_STEP * g_timeMultiply);
                    }
                }

            }
            else {
                g_statusText = "Connecting...";
            }
        }
    }

    // starts playing the warp animation (happens on level change)
    function startWarpEffect() {
        g_warpTime = Constants.WARP_TIME;
        g_warpStarGravity = true;
        g_warpStreaks = [];

        // initialize the collection of streak particles
        for (let i = 0; i < Constants.STREAK_COUNT; i++) {
            let angle = Helpers.getRand(0, 2 * Math.PI);
            let dx = Math.cos(angle);
            let dy = Math.sin(angle);
            let newStreak = {
                x: 0,
                y: 0,
                dx: dx,
                dy: dy,
                speed: Helpers.getRand(1, 4),
            };
            let displacement = Helpers.getRand(1, 64);
            newStreak.x += newStreak.dx * displacement;
            newStreak.y += newStreak.dy * displacement;
            g_warpStreaks.push(newStreak);
        }

        Helpers.playSound(g_soundWarp);
    }

    window.addEventListener("load", main);
})();