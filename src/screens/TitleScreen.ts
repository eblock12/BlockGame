import * as Constants from '../Constants';
import GameScreen from './GameScreen';
import Helpers from '../helpers';
import Input, {InputCommand} from '../Input';
import IScreen from './IScreen';
import Page from '../Page';
import Piece from '../Piece';
import PieceBag from '../PieceBag';

const MAX_PARTICLES = 6;
const MIN_PARTICLE_SPEED = 100;
const MAX_PARTICLE_SPEED = 200;
const MAX_PARTICLE_ROTATION_SPEED = .005;
const PARTICLE_CELL_SCALE = 48;
const TITLE_CELL_SCALE = 24;
const TITLE_TOP_MARGIN = 16;
const TITLE_INITIAL_FALL_SPEED = 800;
const TITLE_GRAVITY = 9000;
const FLASH_SPEED = 1;

export default class TitleScreen implements IScreen {
    private _animatingTitleIn: boolean;
    private _titleRowLimit: number;
    private _titleRowFallOffset: number;
    private _titleRowFallSpeed: number;
    private _titleCellFallOffset: number[];
    private _whiteFlash: number;
    private _menuVisible: boolean;
    private _menuItems: IMenuItem[];
    private _menuSel: number;
    private _particles: PieceParticle[] = [];
    private _particlesVisible: boolean;
    private _glintTime: number;

    private _pendingExitCallback: () => void;
    private _fadeOutTime: number;

    constructor() {
        this._menuItems = [
            { text: 'SINGLE PLAYER', callback: this._onMenuSelectGame },
            { text: 'MULTI PLAYER', callback: this._onMenuSelectMulti },
            { text: 'OPTIONS', callback: this._onMenuSelectOptions },
            { text: 'RECORDS', callback: this._onMenuSelectRecords }
        ];
    }

    public draw(ctx: CanvasRenderingContext2D, step: number) {
        // set to identity matrix
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(Page.current.scaleX, Page.current.scaleY);

        // clear the whole drawing area to a solid color
        ctx.fillStyle = Constants.BACKGROUND_COLOR_TITLE;
        ctx.fillRect(0, 0, Page.current.width, Page.current.height);

        this._drawParticles(ctx);
        this._drawTitle(ctx);

        const menuWidth = 380;
        const menuHeight = 225; 

        if (this._menuVisible) {
            Helpers.Render.drawWindow(
                ctx,
                Page.current.width / 2 - menuWidth / 2,
                Page.current.height - menuHeight - 42,
                menuWidth,
                menuHeight,
                (innerCtx) => this._drawMenuItems(innerCtx, menuWidth, menuHeight)
            );
        }

        if (this._pendingExitCallback) {
            ctx.save();
            ctx.globalAlpha = Math.min(this._fadeOutTime, 1);
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, Page.current.width, Page.current.height);
            ctx.restore();
        }
    }

    public enter(finished: () => void) {
        this._titleRowLimit = -1;
        this._titleRowFallOffset = 0;
        this._titleRowFallSpeed = TITLE_INITIAL_FALL_SPEED
        this._titleCellFallOffset = [];     
        this._whiteFlash = -1;
        this._animatingTitleIn = true;
        this._menuVisible = false;
        this._menuSel = 0;
        this._initializeParticles();
        this._particlesVisible = false;
        this._glintTime = -5;
        this._pendingExitCallback = null;
        this._fadeOutTime = 0;

        Input.on(InputCommand.menuCancel, () => this._onMenuCancel());
        Input.on(InputCommand.menuConfirm, () => this._onMenuConfirm());
        Input.on(InputCommand.menuUp, () => this._onMenuUp());
        Input.on(InputCommand.menuDown, () => this._onMenuDown());

        finished();
    }

    public exit(finished: () => void) {
        Input.offAll();
        this._pendingExitCallback = finished;
    }

    public update(step: number) {
        this._titleRowFallOffset += this._titleRowFallSpeed * step;
        this._titleRowFallSpeed += step * TITLE_GRAVITY;
        
        if (this._animatingTitleIn) {
            if (this._titleRowFallOffset >= 0) {
                this._titleRowLimit++;
                this._titleRowFallOffset = 0 - TITLE_TOP_MARGIN - TITLE_CELL_SCALE - (14 - this._titleRowLimit) * TITLE_CELL_SCALE - Constants.TITLE_ROW_WIDTH * TITLE_CELL_SCALE/2;
                this._titleRowFallSpeed = TITLE_INITIAL_FALL_SPEED;
                for (let x = 0; x < Constants.TITLE_ROW_WIDTH; x++) {
                    //this._titleCellFallOffset[x] = (Constants.TITLE_ROW_WIDTH - x) * TITLE_CELL_SCALE/2;
                    this._titleCellFallOffset[x] = Helpers.Math.getRand(0, Constants.TITLE_ROW_WIDTH * TITLE_CELL_SCALE/2);
                }
            }

            if (this._titleRowLimit === Constants.TITLE_USED_ROWS) {
                this._endAnimateTitleIn();
            }
        } else {
            this._glintTime += step * 0.85;

            if (this._glintTime > 5) {
                this._glintTime = 0;
            }
        }

        if (this._whiteFlash >= 0) {
            this._whiteFlash += FLASH_SPEED * step;
            if (this._whiteFlash >= 1) {
                this._whiteFlash = -1;
            }
        }

        if (this._particlesVisible) {
            for (let particle of this._particles) {
                particle.update(step);
            }
        }

        if (this._pendingExitCallback) {
            this._fadeOutTime += step;
            if (this._fadeOutTime >= 1.5) {
                this._pendingExitCallback();
                this._pendingExitCallback = null;
            }
        }
    }

    private _drawMenuItems(ctx: CanvasRenderingContext2D, menuWidth: number, menuHeight: number) {
        ctx.fillStyle = "#FFF";
        ctx.strokeStyle = "rgb(82, 190, 223)";
        ctx.lineWidth = 0.5;
        ctx.font = Constants.MENU_FONT;

        const ITEM_HEIGHT = menuHeight / this._menuItems.length;
        const OFFSET = 10;

        for (let i = 0; i < this._menuItems.length; i++) {
            let item = this._menuItems[i];
            let textWidth = ctx.measureText(item.text).width;

            if (i === this._menuSel) {
                ctx.save();
                ctx.globalAlpha = 0.65;
                ctx.fillStyle = "rgb(192, 192, 192)";
                ctx.fillRect(0, i * ITEM_HEIGHT, menuWidth, ITEM_HEIGHT);
                ctx.restore();
            }

            Helpers.Render.drawText(
                ctx,
                item.text,
                menuWidth / 2 - textWidth / 2,
                i * ITEM_HEIGHT + ITEM_HEIGHT / 2 + OFFSET);
        }
    }

    private _drawParticles(ctx: CanvasRenderingContext2D) {
        if (this._particlesVisible) {
            for (let particle of this._particles) {
                particle.draw(ctx);
            }
        }
    }

    private _drawTitle(ctx: CanvasRenderingContext2D) {
        this._drawTitleText(ctx, true);
        this._drawTitleText(ctx, false);

        if (this._whiteFlash > 0) {
            let alpha =
                (this._whiteFlash < 0.9) ?
                Math.min(this._whiteFlash * 1.6, 1) :
                (1 - this._whiteFlash) * 10;

            if (this._whiteFlash >= 0.9) {
                this._titleRowLimit = Constants.TITLE_USED_ROWS;
                this._menuVisible = true;
                this._particlesVisible = true;
            }

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = Constants.BACKGROUND_COLOR_WHITE;
            ctx.fillRect(0, 0, Page.current.width, Page.current.height);
            ctx.restore();
        }
    }

    private _drawTitleText(ctx: CanvasRenderingContext2D, dropShadow: boolean) {
        const data = Constants.TITLE_ROW_DATA;
        const width = Constants.TITLE_ROW_WIDTH;

        ctx.save();

        const titlePixelWidth = TITLE_CELL_SCALE * width;

        ctx.translate(Page.current.width / 2 - titlePixelWidth / 2, TITLE_CELL_SCALE);

        let cellColor = 0, rowsDrawn = 0;
        for (let tileY = data.length - 1; tileY >= 0 && rowsDrawn <= this._titleRowLimit; tileY--) {
            const line = data[tileY];
            let mask = 0x80000000;

            if (line) {
                let offsetY =
                    (rowsDrawn === this._titleRowLimit) ?
                    this._titleRowFallOffset :
                    0;

                for (let tileX = (32 - width); tileX < 32; tileX++) {
                    let perCellOffset = offsetY ? this._titleCellFallOffset[(tileX - (32 - width))] : 0;
                    let cellX = (tileX - (32 - width)) * TITLE_CELL_SCALE;
                    let cellY = tileY * TITLE_CELL_SCALE + offsetY + perCellOffset;
                    cellY = Math.min(cellY, tileY * TITLE_CELL_SCALE);

                    if (line & (mask >>> tileX)) {
                        ctx.save();
                        if (dropShadow) {
                            ctx.globalAlpha = 0.65;
                            ctx.fillStyle = "#000";
                            ctx.fillRect(cellX + TITLE_CELL_SCALE / 3, cellY + TITLE_CELL_SCALE / 3, TITLE_CELL_SCALE, TITLE_CELL_SCALE);
                        } else {
                            Helpers.Render.drawCellFromStrip(
                                ctx,
                                cellX,
                                cellY,
                                Constants.TITLE_PALETTE[cellColor],
                                TITLE_CELL_SCALE);

                            if (this._glintTime < 1) {
                                let cellGlint = this._glintTime + (32 - tileX) / 32;
                                if (cellGlint > 1) {
                                    cellGlint -= 1;
                                }
                                if (cellGlint > 0.9) {
                                    ctx.globalAlpha = (1 - cellGlint) * 8;
                                    ctx.fillStyle = "#FFF";
                                    ctx.fillRect(cellX, cellY, TITLE_CELL_SCALE, TITLE_CELL_SCALE);
                                }
                            }
                        }
                        ctx.restore();
                    }
                }

                cellColor++;
                cellColor %= Constants.TITLE_PALETTE.length;
                rowsDrawn++;
            }
        }

        ctx.restore();
    }

    private _endAnimateTitleIn() {
        this._whiteFlash = 0;
        this._animatingTitleIn = false;
    }

    private _initializeParticles() {
        for (let i = 0; i < MAX_PARTICLES; i++) {
            let newParticle = new PieceParticle();
            this._particles.push(newParticle);
        }
    }

    private _onMenuCancel() {
        if (this._animatingTitleIn) {
            this._endAnimateTitleIn();
        }
    }

    private _onMenuConfirm() {
        if (this._animatingTitleIn) {
            this._endAnimateTitleIn();
        } else if (this._menuVisible) {
            let menuItem = this._menuItems[this._menuSel];

            if (menuItem && menuItem.callback) {
                menuItem.callback();
            }
        }
    }

    private _onMenuUp() {
        if (this._menuVisible) {
            this._menuSel--;
            this._menuSel = Helpers.Math.clamp(this._menuSel, 0, this._menuItems.length - 1);
        }
    }

    private _onMenuDown() {
        if (this._menuVisible) {
            this._menuSel++;
            this._menuSel = Helpers.Math.clamp(this._menuSel, 0, this._menuItems.length - 1);
        }
    }

    private _onMenuSelectGame() {
        Page.current.pushScreen(new GameScreen());
    }

    private _onMenuSelectMulti() {

    }

    private _onMenuSelectOptions() {

    }

    private _onMenuSelectRecords() {

    }
}

class PieceParticle {
    private static _pieceBag: PieceBag = new PieceBag();

    private _piece: Piece;
    private _x: number;
    private _y: number;
    private _dx: number;
    private _dy: number;
    private _rotation: number;
    private _dRotatation: number;
    private _width: number;
    private _height: number;

    constructor() {
        this._reset(false /*fromEdge*/);
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        
        ctx.translate(this._width / 2 + this._x, this._height / 2 + this._y);
        ctx.rotate(this._rotation);
        ctx.translate(-this._width / 2, -this._height / 2);
        this._piece.draw(
            ctx,
            PARTICLE_CELL_SCALE,
            false /*highlight*/,
            0 /*x*/,
            0 /*y*/,
            true /*dropShadow*/,
            Math.cos(-this._rotation) * PARTICLE_CELL_SCALE / 3,
            Math.sin(-this._rotation) * PARTICLE_CELL_SCALE / 3);

        ctx.restore();
    }

    public update(step: number) {
        this._x += this._dx * step;
        this._y += this._dy * step;
        this._rotation += this._dRotatation;

        const margin = 4 * PARTICLE_CELL_SCALE;    

        if ((this._x < -margin && this._dx < 0) ||
            (this._x > Page.current.width + margin && this._dx > 0) ||
            (this._y < -margin && this._dy < 0) ||
            (this._y > Page.current.height + margin && this._dy > 0)) {
                this._reset(true /*fromEdge*/);                
        }
    }

    private _reset(fromEdge: boolean) {
        const velocityAngle = Helpers.Math.getRand(0, 2 * Math.PI);
        const velocity = Helpers.Math.getRand(MIN_PARTICLE_SPEED, MAX_PARTICLE_SPEED);

        this._piece = new Piece(PieceParticle._pieceBag.getNewPieceType());
        this._x = Helpers.Math.getRand(0, Page.current.width);
        this._y = Helpers.Math.getRand(0, Page.current.height);
        this._dx = Math.cos(velocityAngle) * velocity;
        this._dy = Math.sin(velocityAngle) * velocity;
        this._rotation = Helpers.Math.getRand(0, 2 * Math.PI);
        this._dRotatation = Helpers.Math.getRand(-MAX_PARTICLE_ROTATION_SPEED, MAX_PARTICLE_ROTATION_SPEED);

        let cellSize = this._piece.getSize();
        this._width = cellSize.width * PARTICLE_CELL_SCALE;
        this._height = cellSize.height * PARTICLE_CELL_SCALE;

        if (fromEdge) {
            const edgeMargin = 4 * PARTICLE_CELL_SCALE;

            if (Math.abs(this._dx) > Math.abs(this._dy)) {
                if (this._dx > 0) {
                    this._x = -edgeMargin;
                } else {
                    this._x = Page.current.width + edgeMargin;
                }
            } else {
                if (this._dy > 0) {
                    this._y = -edgeMargin;
                } else {
                    this._y = Page.current.height + edgeMargin;
                }
            }
        }
    }
}

interface IMenuItem {
    text: string;
    callback: () => void;
}