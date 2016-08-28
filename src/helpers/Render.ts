import * as Constants from '../Constants';
import Page from '../Page';

export default class RenderHelper {
    /** Draws a cell on the screen at the specified pixel location */
    public static drawCellFromStrip(ctx: CanvasRenderingContext2D, x: number, y: number, cellColor: number, cellScale: number): void {
        if (Page.current.cellStripImage) {
            let offset = Page.current.cellStripOffset[cellColor];
            ctx.drawImage(Page.current.cellStripImage, offset, 0, Constants.CELL_SIZE, Constants.CELL_SIZE, x, y, cellScale, cellScale);
        }
    }
    /*
    public static drawGradientText(text, x, y, width, height) {
        let gradient = ctx.createLinearGradient(0, -height, 0, 0);
        gradient.addColorStop(0, "rgb(188,235,188)");
        gradient.addColorStop(1, "rgb(82,188,82)");
        ctx.fillStyle = gradient;
        ctx.fillText(text, 0, 0);
        ctx.strokeText(text, 0, 0);
    }*/

    /** Draws a window with rounded borders, optionally specify a drawFunc to draw the window contents within its bounds */
    public static drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, width, height: number, drawFunc: (ctx: CanvasRenderingContext2D) => (void)): void {
        ctx.save();

        // translate the border and window contents (drawFunc) to the location of the window in the canvas
        ctx.translate(x, y);

        var cornerRadius = 8;

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
    }
}