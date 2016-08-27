import INetworkState from './INetworkState';

export default class ServerConnection {
    private _socket: WebSocket = null;
    private _state: INetworkState;

    constructor(state: INetworkState) {
        this._state = state;
    }

    // established a WebSocket connection at the specified URL
    public connect(url: string) {
        if (!this._state.offlineMode && ("WebSocket" in window)) {
            this._socket = new WebSocket(url);

            this._socket.onopen = this._onSocketOpen;
            this._socket.onmessage = this._onSocketMessage;
            this._socket.onclose = this._onSocketClose;
            this._socket.onerror = this._onSocketError;
        }
        else {
            // WebSockets aren't supported so just go to offline mode
            this._state.offlineMode = true;
        }
    }

    public disconnect() {
        if (this._socket) {
            this._socket.close();
        }
    }

    /** Sends updated Field state to the server */
    public handleFieldUpdate() {
        let scoreData = this._state.activeField.getScoreData();
        let fieldUpdateData = {
            timestamp: this._state.elapsedTime,
            cells: this._state.activeField.getCells(),
            score: scoreData.score,
            lines: scoreData.lines,
            level: scoreData.level
        };
        this._sendMessage("FIELD_UPDATE", JSON.stringify(fieldUpdateData));
    }

    /** Sends updated Piece state to the server */
    public handlePieceUpdate() {
        let activePiece = this._state.activeField.getActivePiece();
        let pieceUpdateData;

        if (activePiece) {
            pieceUpdateData = {
                timestamp: this._state.elapsedTime,
                typeIndex: activePiece.typeIndex,
                x: activePiece.cellX,
                y: activePiece.cellY,
                rotation: activePiece.rotation
            };
        }
        else {
            // empty pieces just set everything to a magic number (-1)
            pieceUpdateData = {
                timestamp: this._state.elapsedTime,
                typeIndex: -1,
                x: -1,
                y: -1,
                rotation: -1
            };
        }
        this._sendMessage("PIECE_UPDATE", JSON.stringify(pieceUpdateData));
    }

    public isOpen(): boolean {
        if (this._socket) {
            return (this._socket.readyState === 1);
        }
        return false;
    }

    private _onSocketOpen(evt: Event) {
    }

    private _onSocketMessage(evt: MessageEvent) {
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
                        this._sendMessage("PONG", msg.Data);
                        break;
                }
            }
        }
    }

    private _onSocketClose(evt: CloseEvent) {
    }

    private _onSocketError(evt: Event) {
    }

    /** Encodes a message for transit through the WebSocket */
    private _sendMessage(type, data) {
        let logPrefix = "";

        if (this._socket && this._socket.readyState === 1) {
            this._socket.send(JSON.stringify({ Type: type, Data: data }));
        }
        else {
            logPrefix = "DROPPED ";
        }

        console.log(logPrefix + "C->S: [" + type + "]: '" + data + "'");
    };
}