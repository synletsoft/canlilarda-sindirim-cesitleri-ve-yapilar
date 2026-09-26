// The card indices correspond to the copied PNG frames in images/.
// Each question has one exact match among its four visible choices.
const animals = [
	{ name: "Kedi",   stomach: 0, teeth: 6, diet: 9,  gut: 12 },
	{ name: "Kurt",   stomach: 0, teeth: 5, diet: 9,  gut: 12 },
	{ name: "Koyun",  stomach: 2, teeth: 3, diet: 10, gut: 11 },
	{ name: "Şahin",  stomach: 1, teeth: 7, diet: 9,  gut: 12 },
	{ name: "İnsan",  stomach: 0, teeth: 4, diet: 8,  gut: 11 },
	{ name: "Ayı",    stomach: 0, teeth: 4, diet: 8,  gut: 11 },
	{ name: "İnek",   stomach: 2, teeth: 3, diet: 10, gut: 11 },
	{ name: "Keçi",   stomach: 2, teeth: 3, diet: 10, gut: 11 },
	{ name: "Geyik",  stomach: 2, teeth: 3, diet: 10, gut: 11 },
	{ name: "Baykuş", stomach: 1, teeth: 7, diet: 9,  gut: 12 },
	{ name: "Tavuk",  stomach: 1, teeth: 7, diet: 8,  gut: 12 },
	{ name: "Karga",  stomach: 1, teeth: 7, diet: 8,  gut: 12 }
];

let game = null;
let soundEnabled = false;
let audioContext = null;

function shuffled(values) {
	const result = [...values];
	for (let i = result.length - 1; i > 0; --i) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

function signature(animal) {
	return `${animal.stomach}/${animal.teeth}/${animal.diet}/${animal.gut}`;
}

function beep(correct) {
	if (!soundEnabled) return;
	try {
		const AudioContextClass = window.AudioContext || window.webkitAudioContext;
		audioContext ||= new AudioContextClass();
		void audioContext.resume();
		const oscillator = audioContext.createOscillator();
		const gain = audioContext.createGain();
		oscillator.type = "sine";
		oscillator.frequency.value = correct ? 740 : 240;
		gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.025);
		gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.26);
		oscillator.connect(gain).connect(audioContext.destination);
		oscillator.start();
		oscillator.stop(audioContext.currentTime + 0.28);
	} catch (error) {
		console.warn("Ses çalınamadı", error);
	}
}

function getParts(runtime) {
	return {
		featureCards: Array.from({ length: 5 }, (_, i) => runtime.getInstanceByUid(100 + i)),
		animalCards: Array.from({ length: 4 }, (_, i) => runtime.getInstanceByUid(110 + i)),
		panel: runtime.getInstanceByUid(130),
		feedback: runtime.getInstanceByUid(131),
		soundButton: runtime.getInstanceByUid(20),
		fullScreenButton: runtime.getInstanceByUid(21)
	};
}

function setQuestion(runtime) {
	const parts = getParts(runtime);
	const target = game.order[game.round];
	const answer = animals[target];
	if (game.round === 0) {
		game.options = [0, 1, 2, 3];
	} else {
		const distractors = shuffled(animals.map((_, i) => i).filter(i =>
			signature(animals[i]) !== signature(answer))).slice(0, 3);
		game.options = shuffled([target, ...distractors]);
	}
	[answer.stomach, answer.teeth, answer.diet, answer.gut, 13]
		.forEach((frame, i) => parts.featureCards[i].animationFrame = frame);
	game.options.forEach((animalIndex, i) =>
		parts.animalCards[i].animationFrame = animalIndex * 3);
	parts.feedback.isVisible = false;
	parts.panel.isVisible = false;
	game.locked = false;
}

function startGame(runtime) {
	game = {
		order: [2, ...shuffled(animals.map((_, i) => i).filter(i => i !== 2))],
		round: 0,
		options: [],
		locked: false,
		menuOpen: false,
		complete: false,
		token: (game?.token ?? 0) + 1
	};
	setQuestion(runtime);
}

function showFeedback(runtime, frame) {
	const toast = runtime.getInstanceByUid(131);
	toast.animationFrame = frame;
	toast.isVisible = true;
}

function answer(runtime, optionIndex) {
	if (game.locked || game.menuOpen || game.complete) return;
	const selected = game.options[optionIndex];
	const correct = selected === game.order[game.round];
	const card = runtime.getInstanceByUid(110 + optionIndex);
	card.animationFrame = selected * 3 + (correct ? 1 : 2);
	showFeedback(runtime, correct ? 0 : 1);
	beep(correct);
	const token = ++game.token;
	if (correct) {
		game.locked = true;
		setTimeout(() => {
			if (!game || game.token !== token) return;
			game.round++;
			if (game.round === animals.length) {
				game.complete = true;
				const panel = runtime.getInstanceByUid(130);
				panel.animationFrame = 1;
				panel.isVisible = true;
				runtime.getInstanceByUid(131).isVisible = false;
			} else {
				setQuestion(runtime);
			}
		}, 1100);
	} else {
		setTimeout(() => {
			if (!game || game.token !== token) return;
			card.animationFrame = selected * 3;
			runtime.getInstanceByUid(131).isVisible = false;
		}, 900);
	}
}

function toggleMenu(runtime) {
	if (game.complete) return;
	game.menuOpen = !game.menuOpen;
	const panel = runtime.getInstanceByUid(130);
	panel.animationFrame = 0;
	panel.isVisible = game.menuOpen;
	runtime.getInstanceByUid(131).isVisible = false;
}

async function shareGame(runtime) {
	const payload = {
		title: "Canlılarda Sindirim Çeşitleri ve Yapıları",
		text: "Sindirim özelliklerine bakarak canlıyı bul!",
		url: location.href
	};
	try {
		if (navigator.clipboard && navigator.maxTouchPoints === 0) {
			await navigator.clipboard.writeText(`${payload.text} ${payload.url}`);
			showFeedback(runtime, 2);
			setTimeout(() => {
				if (game) runtime.getInstanceByUid(131).isVisible = false;
			}, 1800);
		} else if (navigator.share) {
			await navigator.share(payload);
		} else {
			await navigator.clipboard.writeText(`${payload.text} ${payload.url}`);
			showFeedback(runtime, 2);
		}
	} catch (error) {
		if (error?.name !== "AbortError") console.warn("Paylaşım yapılamadı", error);
	}
}

async function toggleFullscreen(runtime) {
	try {
		if (document.fullscreenElement) {
			await document.exitFullscreen();
		} else {
			await document.documentElement.requestFullscreen();
		}
		runtime.getInstanceByUid(21).animationFrame = document.fullscreenElement ? 1 : 0;
	} catch (error) {
		console.warn("Tam ekran açılamadı", error);
	}
}

function hit(x, y, cx, cy, width, height) {
	return Math.abs(x - cx) <= width / 2 && Math.abs(y - cy) <= height / 2;
}

function onPointer(runtime, event) {
	if (!game || runtime.layout.name !== "game") return;
	if (event.pointerType === "mouse" && event.button !== 0) return;
	const [x, y] = runtime.layout.getLayer("game").cssPxToLayer(event.clientX, event.clientY);
	if (hit(x, y, 1420, 70, 99, 100)) return startGame(runtime);
	if (hit(x, y, 1528, 70, 99, 100)) {
		soundEnabled = !soundEnabled;
		runtime.getInstanceByUid(20).animationFrame = soundEnabled ? 1 : 0;
		beep(true);
		return;
	}
	if (hit(x, y, 1636, 70, 99, 100)) return toggleMenu(runtime);
	if (hit(x, y, 1744, 70, 99, 100)) return void shareGame(runtime);
	if (hit(x, y, 1852, 70, 99, 100)) return void toggleFullscreen(runtime);
	if (game.complete) {
		if (hit(x, y, 960, 721, 360, 75)) startGame(runtime);
		return;
	}
	if (game.menuOpen) {
		if (hit(x, y, 960, 721, 360, 75) || !hit(x, y, 960, 540, 900, 512))
			toggleMenu(runtime);
		return;
	}
	for (let i = 0; i < 4; ++i) {
		if (hit(x, y, 382 + 385 * i, 813, 362, 362)) {
			answer(runtime, i);
			return;
		}
	}
}

runOnStartup(async runtime => {
	runtime.addEventListener("afteranylayoutstart", event => {
		if (event.layout.name === "game") startGame(runtime);
	});
	runtime.addEventListener("pointerdown", event => onPointer(runtime, event));
	document.addEventListener("fullscreenchange", () => {
		if (game && runtime.layout.name === "game")
			runtime.getInstanceByUid(21).animationFrame = document.fullscreenElement ? 1 : 0;
	});
});
