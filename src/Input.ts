import * as Constants from './Constants';
import Event from './Event';

interface ICommandState {
    active: boolean,
    duration: number,
    repeatStep: number,
    event: Event<void>;
}

export enum InputCommand {
    // Game play
    shiftLeft,
    shiftRight,
    rotate,
    softDrop,
    hardDrop,
    pause,

    // Menus
    menuLeft,
    menuRight,
    menuUp,
    menuDown,
    menuConfirm,
    menuCancel
}

/** How long (seconds) to hold a command before it starts repeating */
const REPEAT_DELAY = 0.18;

/** How long (seconds) for the period between command repeats */
const REPEAT_PERIOD = 0.08;

/** Which commands need repeating when they're held */
const REPEATED_COMMANDS = [
    InputCommand.shiftLeft,
    InputCommand.shiftRight,
    InputCommand.softDrop
];

export default class Input {
    private static _allCommands: InputCommand[] = [];
    private static _commandStates: {[cmd: number]: ICommandState} = {};
    private static _initialized = false;
    private static _keyBindings: {[keyCode: number]: InputCommand[]} = {};

    public static initialize() {
        if (Input._initialized) {
            return;
        }
        Input._initialized = true;

        // initialize default key bindings
        Input._keyBindings[37 /*Left*/] = [InputCommand.shiftLeft, InputCommand.menuLeft];
        Input._keyBindings[39 /*Right*/] = [InputCommand.shiftRight, InputCommand.menuRight];
        Input._keyBindings[38 /*Up*/] = [InputCommand.rotate, InputCommand.menuUp];
        Input._keyBindings[40 /*Down*/] = [InputCommand.softDrop, InputCommand.menuDown];
        Input._keyBindings[27 /*Esc*/] = [InputCommand.pause, InputCommand.menuCancel];
        Input._keyBindings[32 /*Space*/] = [InputCommand.hardDrop, InputCommand.menuConfirm];
        Input._keyBindings[13 /*Enter*/] = [InputCommand.menuConfirm];

        const objValues = Object.keys(InputCommand).map(k => InputCommand[k]);
        Input._allCommands = objValues.filter(v => typeof v === "number") as InputCommand[];
        for (let command of Input._allCommands) {
            Input._commandStates[command] = {
                active: false,
                duration: 0,
                repeatStep: 0,
                event: new Event<void>()
            };
        }

        document.addEventListener("keydown", (e: KeyboardEvent) => Input._onKeyDown(e));
        document.addEventListener("keyup", (e: KeyboardEvent) => Input._onKeyUp(e));
        window.addEventListener("focus", () => Input._onFocusIn());
        window.addEventListener("blur", () => Input._onFocusOut());
    }

    public static off(command: InputCommand, callback: () => void) {
        let state = Input._commandStates[command];
        if (state && state.event) {
            state.event.off(callback);
        }
    }

    public static offAll() {
        for (let command of Input._allCommands) {
            let state = Input._commandStates[command];
            if (state && state.event) {
                state.event.offAll();
            }
        }
    }

    public static on(command: InputCommand, callback: () => void) {
        let state = Input._commandStates[command];
        if (state && state.event) {
            state.event.on(callback);
        }
    }

    public static update(step: number) {
        for (let commandProp in Input._commandStates) {
            let commandState = Input._commandStates[commandProp];
            let command = <InputCommand>parseInt(commandProp, 10);

            if (commandState && commandState.active) {
                commandState.duration += step;

                if ((commandState.duration > REPEAT_DELAY) &&
                    (REPEATED_COMMANDS.indexOf(command) > -1)) {
                    if (commandState.repeatStep <= 0) {
                        // time until another repeat happens
                        commandState.repeatStep = REPEAT_PERIOD;
                    }
                    else {
                        // repeat is ready, trigger the event
                        commandState.repeatStep -= step;
                        if (commandState.repeatStep <= 0) {
                            Input._onCommandRepeated(command);
                        }
                    }
                }
            }
        }
    }

    private static _onCommandActivated(command: InputCommand) {
        let state = Input._commandStates[command];
        state.active = true;
        state.duration = 0;
        state.repeatStep = 0;
        state.event.fire();
    }

    private static _onCommandRepeated(command: InputCommand) {
        Input._commandStates[command].event.fire();
    }

    private static _onCommandReleased(command: InputCommand) {
        Input._commandStates[command].active = false;
    }

    private static _onFocusIn() {
        for (let command of Input._allCommands) {
            Input._onCommandReleased(command);
        }
    }

    private static _onFocusOut() {
        for (let command of Input._allCommands) {
            Input._onCommandReleased(command);
        }
    }

    private static _onKeyDown(e: KeyboardEvent) {
        let commandsPressed = Input._keyBindings[e.keyCode];
        if (commandsPressed) {
            for (let command of commandsPressed) {
                if (!Input._commandStates[command].active) {
                    Input._onCommandActivated(command);
                }
            }
        }
    }

    private static _onKeyUp(e: KeyboardEvent) {
        let commandsPressed = Input._keyBindings[e.keyCode];
        if (commandsPressed) {
            for (let command of commandsPressed) {
                Input._onCommandReleased(command);
            }
        }
    }
}