/** The length of time (seconds) before a step (physics update) is performed */
export const TIME_STEP = 1 / 60;

/** The effective drawing width (this is scaled to the canvas dimensions) */
export const FIXED_WIDTH = 1280;

/** The effective drawing height (this is scaled to the canvas dimensions) */
export const FIXED_HEIGHT = 720;

/** Background (clear) color for the screen */
export const BACKGROUND_COLOR = "rgb(0,0,0)";

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

/** How long (seconds) to hold a key before it starts repeating */
export const REPEAT_DELAY = 0.18;

/** How long (seconds) for the period between key repeats */
export const REPEAT_PERIOD = 0.08;

/** Which key codes need repeating when they're held */
export const REPEATED_KEY_CODES = [37, 39, 40];

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

/** Maximum number of sounds that can play at once */
export const MAX_AUDIO_CHANELS = 100;