import Field from './Field';

export interface INetworkState {
    activeField: Field;
    elapsedTime: number;
    offlineMode: boolean;
}

export default INetworkState;