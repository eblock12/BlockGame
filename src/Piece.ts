import * as Constants from './Constants';
import Helpers from './helpers';

/** Stores the state of a game Piece (i.e. it's type, position, rotation) */
export default class Piece {
    /** The type of piece */
    public typeIndex: number;

    /** Cell location on the field (x-axis) */
    public cellX: number;

    /** Cell location on the field (y-axis) */
    public cellY: number;

    /** Rotation state of the piece (0-3) */
    public rotation: number;

    // used for smooth piece falling (not supported anymore)
    private _offsetY: number;

    constructor(type?: number) {
        this.typeIndex =
            typeof type === 'undefined' ?
            Helpers.Math.getRandInt(0, Constants.PIECE_DATA.length - 1) :
            type;
        this.cellX = Constants.FIELD_COLUMN_COUNT / 2 - 2;
        this.cellY = 0;
        this.rotation = 0;
        this._offsetY = 0;
    }

    /**
     * Renders the piece using the specified canvas 2D context, cellScale is the width/height in pixels of each cell in the Piece,
     * highlight to true will draw the piece with slightly brighter colors than normal, specify x/y will translate the Piece by so many pixels
     */
    public draw(ctx: CanvasRenderingContext2D, cellScale: number, highlight?: boolean, x?: number, y?: number) {
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
                    let finalY = Math.floor(y * cellScale + this._offsetY);

                    Helpers.Render.drawCellFromStrip(ctx, finalX, finalY, cell, cellScale);

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

    /** Returns a collection of Cells that makeup this piece */
    public getCells() {
        return Constants.PIECE_DATA[this.typeIndex][this.rotation];
    }

    // returns the tight cell bounds (width/height) of the piece
    private _getSize() {
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
}