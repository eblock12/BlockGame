export default class MathHelper {
    public static getRand(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    public static getRandInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}