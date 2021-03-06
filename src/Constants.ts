/** The length of time (seconds) before a step (physics update) is performed */
export const TIME_STEP = 1 / 60;

/** The effective drawing width (this is scaled to the canvas dimensions) */
export const FIXED_WIDTH = 1280;

/** The effective drawing height (this is scaled to the canvas dimensions) */
export const FIXED_HEIGHT = 720;

/** Background (clear) color for the screen */
export const BACKGROUND_COLOR = "rgb(0,0,0)";

/** Background (clear) color for the screen */
export const BACKGROUND_COLOR_TITLE = "rgb(30,30,30)";

/** Background (white-out) color for the screen */
export const BACKGROUND_COLOR_WHITE = "rgb(255,255,255)";

/** The width and height of a cell (pixels) */
export const CELL_SIZE = 32;

/** Background color of the game field (this is a slight blue) */
export const FIELD_BACKGROUND_COLOR = "rgb(0,12,48)";

/** Border color of the game field */
export const FIELD_BORDER_COLOR = "rgb(255,255,255)";

/** Width of the game field (pixels) */
export const FIELD_BORDER_WIDTH = 4;

/** Number of cell columns in the game field */
export const FIELD_COLUMN_COUNT = 10;

/** Number of cell rows in the game field */
export const FIELD_ROW_COUNT = 22;

/** The number of rows at the top of game field which are hidden from view (clipped) */
export const FIELD_HIDDEN_ROW_COUNT = 2;

/** How long (seconds) does the row clearing animation last */
export const FIELD_ROW_CLEAR_TIME = 0.4;

/** Score multipled by level number when player clears 1 line */
export const SCORE_SINGLE_LINES = 100;

/** Score multipled by level number when player clears 2 lines */
export const SCORE_DOUBLE_LINES = 300;

/** Score multipled by level number when player clears 3 lines */
export const SCORE_TRIPLE_LINES = 500;

/** Score multipled by level number when player clears 4 lines (tetris) */
export const SCORE_TETRIS_LINES = 800;

/** Score multiplied by the number of rows the piece was soft dropped */
export const SCORE_SOFT_DROP = 1;

/** Score multiplied by the number of rows the piece was hard dropped */
export const SCORE_HARD_DROP = 2;

/** Number of lines to clear before the level is incremented */
export const LINES_PER_LEVEL = 10;

/** The level number won't go above this */
export const MAX_LEVEL = 20;

/** Fall delay speeds for each level (starting at level 1) and speeding up */
export const LEVEL_SPEEDS = [0.8, 0.72, 0.63, 0.55, 0.47, 0.38, 0.3, 0.22, 0.13, 0.1, 0.08, 0.08, 0.08, 0.07, 0.07, 0.07, 0.05, 0.05, 0.05, 0.03];

/** How long (seconds) until a piece is locked to the game field */
export const LOCK_DELAY = 0.5;

/** Number of star particles in the background */
export const STAR_COUNT = 30;

/** Star particle velocity */
export const STAR_SPEED = 15;

/** How long does a star particle last (seconds) */
export const STAR_LIFESPAN = 30;

/** How long does a start take to fade in and out (seconds) */
export const STAR_FADE_TIME = 5;

/** How long does the warp effect (level change transition) last */
export const WARP_TIME = 3;

/** Fill style used to fade the background to white */
export const WHITE_FADER_COLOR = "rgb(180,180,180)";

/** Number of streak partices in the background during a warp effect */
export const STREAK_COUNT = 250;

/** Font used to draw large text in the game field (e.g. Game Over) */
export const BIG_FIELD_FONT = "110px Impact, Charcoal, sans-serif";

/** Font size used to draw large text in the game field (e.g. Game Over) */
export const BIG_FIELD_FONT_SIZE = 110;

/** Font used for the Pause mode text */
export const PAUSE_FONT = "150px Impact, Charcoal, sans-serif";

/** Font size used for the Pause mode text */
export const PAUSE_FONT_SIZE = 150;

/** Font used to render scores and labels */
export const SCORE_FONT = "18px Lucida Console, Monaco, monospace";

/** Font size used to render scores and labels */
export const SCORE_FONT_SIZE = 18;

/** Font used to render menu text */
export const MENU_FONT = "32px Lucida Console, Monaco, monospace";

/** Font size used to render menu text */
export const MENU_FONT_SIZE = 32;

/** Maximum number of sounds that can play at once */
export const MAX_AUDIO_CHANELS = 100;

/** Stores the cell layout of each possible piece, for all 4 possible rotations, is piece stored in a 4x4 grid */
export const PIECE_DATA = [
    // 0
    [
        [0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0],
        [0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0]
    ],

    // 1
    [
        [5, 0, 0, 0, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 5, 5, 0, 0, 5, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 5, 5, 5, 0, 0, 0, 5, 0, 0, 0, 0, 0],
        [0, 5, 0, 0, 0, 5, 0, 0, 5, 5, 0, 0, 0, 0, 0, 0]
    ],

    // 2
    [
        [0, 0, 6, 0, 6, 6, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 6, 0, 0, 0, 6, 0, 0, 0, 6, 6, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 6, 6, 6, 0, 6, 0, 0, 0, 0, 0, 0, 0],
        [6, 6, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0]
    ],

    // 3
    [
        [0, 3, 3, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 3, 3, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 3, 3, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 3, 3, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],

    // 4
    [
        [0, 7, 7, 0, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 7, 0, 0, 0, 7, 7, 0, 0, 0, 7, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 7, 7, 0, 7, 7, 0, 0, 0, 0, 0, 0],
        [7, 0, 0, 0, 7, 7, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0]
    ],

    // 5
    [
        [0, 2, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 2, 0, 0, 0, 2, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 2, 2, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0],
        [0, 2, 0, 0, 2, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0]
    ],

    // 6
    [
        [1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]
    ]
];


/** Kick tables allow some play in the piece location when the user is rotating it
 *  http://www.tetrisconcept.net/wiki/SRS#Wall_Kicks
 *  table for J, L, S, T, Z shaped pieces
 */
export const WALL_KICK_TABLE = [
    [[-1, 0], [-1, 1], [0, -2], [-1, -2]], // O->R
    [[1, 0], [1, -1], [0, 2], [1, 2]],     // R->2
    [[1, 0], [1, 1], [0, -2], [1, -2]],    // 2->L
    [[-1, 0], [-1, -1], [0, 2], [-1, 2]]   // L->O
];

/** Alternate table for "I" shaped pieces */
export const WALL_KICK_TABLE_ALT = [
    [[-2, 0], [1, 0], [-2, -1], [1, 2]], // O->R
    [[-1, 0], [2, 0], [-1, 2], [2, -1]], // R->2
    [[2, 0], [-1, 0], [2, 1], [-1, -2]], // 2->L
    [[1, 0], [-2, 0], [1, -2], [-2, 1]]  // L->O
];

export const TITLE_ROW_WIDTH = 29;
export const TITLE_USED_ROWS = 14;
export const TITLE_ROW_DATA = [
    0x1C40C391, 0x12412412, 0x12412414, 0x1C412418, 0x12412414, 0x12412412, 0x1C78C391,
    0x00000000, 0x00000000,
    0x03C7113C, 0x04089B20, 0x04089520, 0x05C8953C, 0x044F9120, 0x04489120, 0x0388913C
];
export const TITLE_PALETTE = [1, 6, 3, 7, 4, 5, 2];