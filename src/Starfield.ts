import * as Constants from './Constants';
import Page from './Page';
import Helpers from './helpers';

export default class Starfield {
    // spin angle of the background vortex
    private _vortexSpin = 0;

    // collection of star particles
    private _stars = [];

    // countsdown the warp background effect (happens on level change), when it reaches 0 the effect is over
    private _warpTime = 0;

    // collection of "streak" particles for the warp effect
    private _warpStreaks = [];

    // when true, the star particles are pulled into the vortex (center of screen)
    private _warpStarGravity = false;

    constructor() {
        this._resetStars();
    }

    /** Renders the Starfield effect to the specific canvas */
    public draw(ctx: CanvasRenderingContext2D, width: number, height: number, step: number) {
        this._drawBackground(ctx, width, height, step);
    }

    /** Starts playing the warp animation (happens on level change) */
    public startWarpEffect() {
        this._warpTime = Constants.WARP_TIME;
        this._warpStarGravity = true;
        this._warpStreaks = [];

        // initialize the collection of streak particles
        for (let i = 0; i < Constants.STREAK_COUNT; i++) {
            let angle = Helpers.Math.getRand(0, 2 * Math.PI);
            let dx = Math.cos(angle);
            let dy = Math.sin(angle);
            let newStreak = {
                x: 0,
                y: 0,
                dx: dx,
                dy: dy,
                speed: Helpers.Math.getRand(1, 4),
            };
            let displacement = Helpers.Math.getRand(1, 64);
            newStreak.x += newStreak.dx * displacement;
            newStreak.y += newStreak.dy * displacement;
            this._warpStreaks.push(newStreak);
        }

        Helpers.Audio.playSound(Page.current.soundWarp);
    }

    /** Draws the vortex and star effects, upon level transition a specific space warp animation runs and is drawn here */
    private _drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, step: number) {
        ctx.save();

        // clear the whole drawing area to a solid color
        ctx.fillStyle = Constants.BACKGROUND_COLOR;
        ctx.fillRect(0, 0, width, height);

        // set origin to the center of the drawing area
        ctx.translate(width / 2, height / 2);

        // normalize the warp time animation from 0 to 1 (animation is finished when it hits 1)
        let warpTimeNormalized = 1 - (this._warpTime / Constants.WARP_TIME);

        // calculate the size of the background effect (the smallest of the two dimensions that make up the drawing area)
        let minDim = Math.min(width, height);

        if ((this._warpTime > 0) && (warpTimeNormalized < 0.9)) {
            // the last 10% of the warp animation will scale down the background, which creates an impression that we're flying away from it
            minDim *= 1 - warpTimeNormalized;
        }

        // if the vortex image was loaded from the server, scale and rotate it, then draw
        if (Page.current.vortexImage) {
            ctx.save();
            ctx.scale(minDim / 512, minDim / 512);
            ctx.rotate(this._vortexSpin)
            ctx.drawImage(Page.current.vortexImage, -256, -256);
            ctx.restore();
        }

        // if star image was loaded from the server, draw the star particles
        if (Page.current.starImage) {
            for (let i = 0, len = this._stars.length; i < len; i++) {
                let star = this._stars[i];
                ctx.save();
                ctx.rotate(this._vortexSpin);
                ctx.translate(star.x, star.y);
                ctx.scale(star.scale, star.scale);

                let lifeLeft = Constants.STAR_LIFESPAN - star.life;
                if (star.life < Constants.STAR_FADE_TIME) {
                    // fades the star in at the beginning of its life
                    ctx.globalAlpha = star.life / Constants.STAR_FADE_TIME;
                }
                if (lifeLeft < Constants.STAR_FADE_TIME) {
                    // fades the star out at the end of its life
                    ctx.globalAlpha = lifeLeft / Constants.STAR_FADE_TIME;
                }

                // offset image by its dimension so its centered properly
                ctx.drawImage(Page.current.starImage, -32, -32);

                ctx.restore();

                if (this._warpStarGravity) {
                    // if gravity is turned on, suck the stars toward the center of the screen
                    star.x -= star.x * step;
                    star.y -= star.y * step;
                }
                else {
                    // apply star velocity by multiplying its direction vector by its speed times the current physics step
                    star.x += star.dx * Constants.STAR_SPEED * step * star.speed;
                    star.y += star.dy * Constants.STAR_SPEED * step * star.speed;
                }
                star.life += step * star.speed;

                // if star is dead, spawn a center star at the center
                if (star.life > Constants.STAR_LIFESPAN) {
                    let angle = Helpers.Math.getRand(0, 2 * Math.PI);
                    star.x = 0;
                    star.y = 0;
                    star.scale = Helpers.Math.getRand(0.1, 0.5); // random size
                    star.dx = Math.cos(angle); // direction vector X component
                    star.dy = Math.sin(angle); // direction vector Y component
                    star.life = 0;
                }
            }
        }

        // if this is non-zero, the warp animation is running
        if (this._warpTime > 0) {
            // define a radial gradient that is used to color the streak particles
            let streakGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 512);
            streakGradient.addColorStop(0, "rgb(3, 9, 255)");
            streakGradient.addColorStop(0.5, "rgb(64, 255, 255)");
            streakGradient.addColorStop(1, "rgb(3, 9, 255)");

            // draw streak particles during the first 90% of the animation time
            if (warpTimeNormalized < 0.9) {
                for (let i = 0, len = this._warpStreaks.length; i < len; i++) {
                    let streak = this._warpStreaks[i];

                    // as animation runs, the length of the streaks increase by some arbitary factor
                    let length = (800 * warpTimeNormalized);

                    ctx.save();

                    // for first 25% of the animation, fade in the streak particles
                    if (warpTimeNormalized < 0.25) {
                        ctx.globalAlpha = warpTimeNormalized * 4;
                    }

                    // render the streak particles as lines along their direction vector
                    ctx.strokeStyle = streakGradient;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(streak.x, streak.y);
                    ctx.lineTo(streak.x + streak.dx * length, streak.y + streak.dy * length);
                    ctx.stroke();
                    ctx.restore();

                    // move the streaks out from the center of the screen at their respective speeds
                    streak.x += streak.dx * step * (streak.speed * 200 * (0.4 - warpTimeNormalized));
                    streak.y += streak.dy * step * (streak.speed * 200 * (0.4 - warpTimeNormalized));

                    // if streak gets too far from the center, it wraps back to the center of the screen
                    if ((Math.abs(streak.x) > width / 2) || (Math.abs(streak.y) > height / 2)) {
                        streak.x = 0;
                        streak.y = 0;
                    }
                }
            }

            // for the last 70% of the warp animation, start fading the background to a white flash, then at 90% finished start fading back in
            if (warpTimeNormalized > 0.3) {
                ctx.save();
                if (warpTimeNormalized < 0.9) {
                    // slowly fade the background to white, it reaches
                    ctx.globalAlpha = Math.min((warpTimeNormalized - 0.3) * 1.9, 1.0);
                }
                else {
                    // turn off the star particle gravity effect
                    if (this._warpStarGravity) {
                        // reset stars back to normal locations so they're not clumped together
                        this._resetStars();
                        this._warpStarGravity = false;
                    }

                    // animate fading back in for the last 10% of the warp animation
                    ctx.globalAlpha = (1 - warpTimeNormalized) * 10;
                }

                // render the white fade-out effect
                ctx.fillStyle = Constants.WHITE_FADER_COLOR;
                ctx.fillRect(-width / 2, -height / 2, width, height);
                ctx.restore();
            }

            // animation time is counting down to 0
            this._warpTime -= step;
        };

        ctx.restore();

        // adjust vortex spin rate during the warp animatino
        let spinSpeed = 0.05;
        if ((this._warpTime > 0) && (warpTimeNormalized < 0.9)) {
            spinSpeed = 0.1 + warpTimeNormalized * 0.4;
        }

        this._vortexSpin += step * spinSpeed;
    }

    private _resetStars() {
        this._stars = [];
        for (let i = 0; i < Constants.STAR_COUNT; i++) {
            let angle = Helpers.Math.getRand(0, 2 * Math.PI);
            let dx = Math.cos(angle);
            let dy = Math.sin(angle);
            let newStar = {
                x: 0,
                y: 0,
                dx: dx, // direction vector X component
                dy: dy, // direction vector Y component
                scale: Helpers.Math.getRand(0.1, 0.5),
                speed: Helpers.Math.getRand(1.0, 2.5),
                life: 0
            };

            // stars spawn at a random place along their life span so they're not all clumped together at the center
            let life = Helpers.Math.getRand(0, Constants.STAR_LIFESPAN);
            newStar.x += dx * life * Constants.STAR_SPEED;
            newStar.y += dy * life * Constants.STAR_SPEED;
            newStar.life = life;

            this._stars.push(newStar);
        }
    }
}