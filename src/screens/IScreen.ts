export interface IScreen {
    draw(ctx: CanvasRenderingContext2D, step: number);
    enter(finished: () => void);
    exit(finished: () => void);
    update(step: number);
}

export default IScreen;