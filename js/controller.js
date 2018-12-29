import { australiaPoints } from "./australia-points";
import { usaPoints } from "./usa-points";
import { getFourierData, resample2dData } from "./fourier";
import { gray, divideInterval, slurp, easeInOut, loop } from "./util";

const FFTPoints = 1024;

// I'm lazy
const ausPoints = australiaPoints;

export default class Controller {

	constructor() {
		this.animAmt = 0;
		this.period = 4;

		this.ausFFT = getFourierData(resample2dData(ausPoints, FFTPoints));
		this.usaFFT = getFourierData(resample2dData(usaPoints, FFTPoints));

		this.drawnPoints = [];

		this.lastFourierX = 0;
		this.lastFourierY = 0;
	}

	update(dt) {
		this.animAmt += dt / this.period;
		this.animAmt %= 1;
	}

	getFullPath(fft) {
		const path = [];

		for (let i = 0; i < FFTPoints; i ++) {
			const amt = i / FFTPoints;

			const point = this.renderCircles(null, fft, amt);
			path.push(point);
		}
		
		return path;
	}

	/**
	 * 
	 * @param {CanvasRenderingContext2D} context 
	 */
	render(context) {
		const transAmt = easeInOut(loop(this.animAmt), 2);
		const fft = this.fftLerp(this.ausFFT, this.usaFFT, transAmt);
		const path = this.getFullPath(fft);
		this.renderPath(context, path, true);
	}

	fftLerp(fft1, fft2, amt) {
		let newFFT = [];
		for (let i = 0; i < FFTPoints; i ++) {
			let newVal = {
				freq: fft1[i].freq,
				amplitude: slurp(fft1[i].amplitude, fft2[i].amplitude, amt),
				phase: this.angularLerp(fft1[i].phase, fft2[i].phase, amt),
			};
			newFFT.push(newVal);
		}
		return newFFT;
	}

	angularLerp(angle1, angle2, amt) {
		// really slow :(
		const xTotal = (1 - amt) * Math.cos(angle1) + amt * Math.cos(angle2);
		const yTotal = (1 - amt) * Math.sin(angle1) + amt * Math.sin(angle2);
		return Math.atan2(yTotal, xTotal);
	}

	renderLine(context, startX, startY, endX, endY) {
		context.beginPath();
		context.strokeStyle = 'black';
		context.moveTo(startX, startY);
		context.lineTo(endX, endY);
		context.stroke();
	}

	/**
	 * @param {CanvasRenderingContext2D} context 
	 */
	renderPath(context, path, closePath=true) {
		context.beginPath();
		for (let i = 0; i < path.length; i ++) {
			const amt = i / FFTPoints;

			if (i == 0) {
				context.moveTo(path[i].x, path[i].y);
			}
			else {
				context.lineTo(path[i].x, path[i].y);
			}
		}
		if (closePath) {
			context.closePath();
		}
		context.stroke();
	}

	renderCircles(context, fourierData, amt) {
        let runningX = 0;
        let runningY = 0;
        for (let i = 0; i < fourierData.length; i ++) {
            const amplitude = fourierData[i].amplitude;
            const angle = 2 * Math.PI * fourierData[i].freq * amt + fourierData[i].phase;
            runningX += amplitude * Math.cos(angle);
            runningY += amplitude * Math.sin(angle);
            if (i == 0) {
                continue; // we skip the first one because we just don't care about rendering the constant term
            }
            if (amplitude < 0.5) {
                continue; // skip the really tiny ones
			}
			if (context === null) {
				continue;
			}
            context.beginPath();
            context.strokeStyle = 'black';
            context.lineWidth = 1;
            context.moveTo(runningX, runningY);
            context.arc(runningX, runningY, amplitude, angle - Math.PI, angle + Math.PI);
            context.stroke();
		}
		if (context) {
			context.globalAlpha = 1;
		}

		return {x: runningX, y: runningY};
    }


}
