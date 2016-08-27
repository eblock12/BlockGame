export default class PieceBag {
    private _contents: number[];
    private _index: number;

    constructor() {
        this._initialize();
    }

    public getNewPieceType() {
        let result = this._contents[this._index];
        this._index++;

        if (this._index >= this._contents.length) {
            this._initialize();
        }

        return result;
    }

    private _initialize() {
        this._contents = this._shuffle([0, 1, 2, 3, 4, 5, 6]);
        this._index = 0;
    }

    private _shuffle(array: number[]): number[] {
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