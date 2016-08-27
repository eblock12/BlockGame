import Page from '../page';

export default class AudioHelper {
    public static playSound(sound): void {
        if (!sound || !sound.buffered) {
            // sound isn't ready, don't play
            return;
        }

        if (Page.current.enableAudio || window.location.hash == "#mute") {
            return;
        }

        let now = (new Date()).getTime();
        for (let i = 0; i < Page.current.audioChan.length; i++) {
            let audioChan = Page.current.audioChan[i];
            if (audioChan.finished < now) {
                let dur = sound.duration;
                if (dur == NaN) {
                    dur = 0.4;
                }

                audioChan.finished = now + dur * 1000;
                audioChan.channel.src = sound.src;
                audioChan.channel.load();
                audioChan.channel.play();
                break;
            }
        }
    }
}