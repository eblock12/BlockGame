export default class MathHelper {
    public static clamp(num: number, min: number, max: number) {
        return Math.min(Math.max(num, min), max);
    }

    public static getRand(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    public static getRandInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}