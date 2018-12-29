import { treePoints } from "./tree-points";
import { presentPoints } from "./present-points";
import { getFourierData, resample2dData } from "./fourier";
import { gray, divideInterval } from "./util";

const FFTPoints = 1024;

export default class Controller {

	constructor() {
		this.animAmt = 0;
		this.period = 20;
		this.cyclesPerPeriod = 2;

		this.xTreeYPresent = [];
		this.yTreeXPresent = [];
		for (let i = 0; i < presentPoints.length; i ++) {
			this.xTreeYPresent.push({
				x: treePoints[i].x,
				y: presentPoints[i].y,
			})
			this.yTreeXPresent.push({
				x: presentPoints[i].x,
				y: treePoints[i].y,
			})
		}
		this.topLeftFFT = getFourierData(resample2dData(this.yTreeXPresent, FFTPoints));
		this.bottomRightFFT = getFourierData(resample2dData(this.xTreeYPresent, FFTPoints));

		this.treeDrawnPoints = [];
		this.presentDrawnPoints = [];

		this.lastFourierX = 0;
		this.lastFourierY = 0;
	}

	update(dt) {
		let framesDone = 0;
		dt %= 1;

		while (framesDone < dt / this.period) {
			this.animAmt += (1 / this.cyclesPerPeriod) / FFTPoints;
			if (this.animAmt >= 1) {
				this.treeDrawnPoints = [];
				this.presentDrawnPoints = [];
			}
			this.animAmt %= 1;
			framesDone += (1 / this.cyclesPerPeriod) / FFTPoints;
	
			this.renderCircles(null, this.topLeftFFT, this.cyclesPerPeriod * this.animAmt, 'topleft');
			this.renderCircles(null, this.bottomRightFFT, this.cyclesPerPeriod * this.animAmt, 'bottomright');
	
			this.treeDrawnPoints.push({
				x: this.bottomRightX,
				y: this.topLeftY,
			});
			this.presentDrawnPoints.push({
				x: this.topLeftX,
				y: this.bottomRightY,
			});
	
			while (this.treeDrawnPoints.length > FFTPoints) {
				this.treeDrawnPoints.shift();
			}
			while (this.presentDrawnPoints.length > FFTPoints) {
				this.presentDrawnPoints.shift();
			}
		}
	}

	/**
	 * 
	 * @param {CanvasRenderingContext2D} context 
	 */
	render(context) {
		const sep = 200;

		context.translate(-sep / 2, -sep / 2);
		this.renderCircles(context, this.topLeftFFT, this.cyclesPerPeriod * this.animAmt, 'topleft');

		context.translate(sep, sep);

		this.renderCircles(context, this.bottomRightFFT, this.cyclesPerPeriod * this.animAmt, 'bottomright');

		context.translate(-sep / 2, -sep / 2);

		const alphaAmt = 1 - divideInterval(this.animAmt, 0.97, 1);
		context.globalAlpha = alphaAmt;
		context.translate(sep / 2, -sep / 2);
		this.renderPath(context, this.treeDrawnPoints, false);
		context.translate(-sep, sep);
		this.renderPath(context, this.presentDrawnPoints, false);
		context.translate(sep / 2, -sep / 2);
		context.globalAlpha = 1;

		context.lineWidth = 1;
		this.renderLine(
			context,
			this.topLeftX - sep / 2, this.topLeftY - sep / 2,
			this.bottomRightX + sep / 2, this.topLeftY - sep / 2,
		);
		this.renderLine(
			context,
			this.topLeftX - sep / 2, this.topLeftY - sep / 2,
			this.topLeftX - sep / 2, this.bottomRightY + sep / 2,
		);
		this.renderLine(
			context,
			this.bottomRightX + sep / 2, this.bottomRightY + sep / 2,
			this.bottomRightX + sep / 2, this.topLeftY - sep / 2,
		);
		this.renderLine(
			context,
			this.bottomRightX + sep / 2, this.bottomRightY + sep / 2,
			this.topLeftX - sep / 2, this.bottomRightY + sep / 2,
		);
	}

	renderLine(context, startX, startY, endX, endY) {
		context.beginPath();
		context.strokeStyle = 'black';
		context.moveTo(startX, startY);
		context.lineTo(endX, endY);
		context.stroke();
	}

	renderPath(context, path, closePath=true) {
		
		let start = 1;
		if (closePath) {
			start = 0;
		}
		for (let i = start; i < path.length; i ++) {
			const amt = i / FFTPoints;
			let whiteAmt = 1 - amt;
			whiteAmt = Math.pow(whiteAmt, 4);
			const curPoint = path[i];
			const prevPoint = path[(i - 1 + path.length) % path.length];

			context.beginPath();
			context.strokeStyle = gray(whiteAmt);
			context.lineWidth = 2;
			context.moveTo(prevPoint.x, prevPoint.y);
			context.lineTo(curPoint.x, curPoint.y);
			context.stroke();
		}
	}

	renderCircles(context, fourierData, amt, type='topleft') {
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
		
		if (type == 'topleft') {
			this.topLeftX = runningX;
			this.topLeftY = runningY;
		}
		else {
			this.bottomRightX = runningX;
			this.bottomRightY = runningY;
		}
    }


}
