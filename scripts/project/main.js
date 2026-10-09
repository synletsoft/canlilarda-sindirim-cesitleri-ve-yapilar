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
let soundEnabled = true;
let audioContext = null;
let masterGain = null;
const soundBuffers = new Map();
const correctAnswerDelayMs = 2000;

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

function getAudioContext() {
	const AudioContextClass = window.AudioContext || window.webkitAudioContext;
	if (!audioContext) {
		audioContext = new AudioContextClass();
		masterGain = audioContext.createGain();
		masterGain.gain.value = soundEnabled ? 1 : 0;
		masterGain.connect(audioContext.destination);
	}
	return audioContext;
}

function prepareSounds(runtime) {
	const context = getAudioContext();
	for (const name of ["click", "true", "false", "greeting"]) {
		const buffer = Promise.resolve(runtime.assets.getMediaFileUrl(`${name}.webm`))
			.then(url => runtime.assets.fetchArrayBuffer(url))
			.then(data => context.decodeAudioData(data))
			.catch(error => {
				console.warn(`${name}.webm yüklenemedi`, error);
				return null;
			});
		soundBuffers.set(name, buffer);
	}
}

async function playSound(name, force = false) {
	if (!force && !soundEnabled) return;
	try {
		const context = getAudioContext();
		void context.resume();
		const buffer = await soundBuffers.get(name);
		if (!buffer || (!force && !soundEnabled)) return;
		const source = context.createBufferSource();
		source.buffer = buffer;
		source.connect(force ? context.destination : masterGain);
		source.start();
	} catch (error) {
		console.warn(`${name}.webm çalınamadı`, error);
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
	if (!game.optionsByRound[game.round]) {
		if (game.round === 0) {
			game.optionsByRound[game.round] = [0, 1, 2, 3];
		} else {
			const distractors = shuffled(animals.map((_, i) => i).filter(i =>
				signature(animals[i]) !== signature(answer))).slice(0, 3);
			game.optionsByRound[game.round] = shuffled([target, ...distractors]);
		}
	}
	[answer.stomach, answer.teeth, answer.diet, answer.gut, 13]
		.forEach((frame, i) => parts.featureCards[i].animationFrame = frame);
	game.optionsByRound[game.round].forEach((animalIndex, i) => {
		const card = parts.animalCards[i];
		card.animationFrame = animalIndex * 3;
		card.width = 362;
		card.height = 362;
	});
	runtime.getInstanceByUid(140).isVisible = game.round > 0;
	runtime.getInstanceByUid(141).isVisible = game.round < animals.length - 1;
	parts.feedback.isVisible = false;
	parts.panel.isVisible = false;
	game.locked = game.solved[game.round];
}

function startGame(runtime) {
	game = {
		order: [2, ...shuffled(animals.map((_, i) => i).filter(i => i !== 2))],
		round: 0,
		optionsByRound: [],
		solved: Array(animals.length).fill(false),
		locked: false,
		menuOpen: false,
		complete: false,
		token: (game?.token ?? 0) + 1
	};
	runtime.getInstanceByUid(20).animationFrame = soundEnabled ? 1 : 0;
	setQuestion(runtime);
}

function answer(runtime, optionIndex) {
	if (game.locked || game.menuOpen || game.complete) return;
	const selected = game.optionsByRound[game.round][optionIndex];
	const correct = selected === game.order[game.round];
	void playSound(correct ? "true" : "false");
	const card = runtime.getInstanceByUid(110 + optionIndex);
	card.animationFrame = selected * 3 + (correct ? 1 : 2);
	const token = ++game.token;
	if (correct) {
		game.solved[game.round] = true;
		game.locked = true;
		game.complete = game.solved.every(Boolean);
		if (game.complete) {
			setTimeout(() => {
				if (!game || game.token !== token) return;
				const panel = runtime.getInstanceByUid(130);
				panel.animationFrame = 1;
				panel.isVisible = true;
				void playSound("greeting");
			}, correctAnswerDelayMs);
		} else {
			setTimeout(() => {
				if (!game || game.token !== token) return;
				for (let offset = 1; offset < animals.length; offset++) {
					const nextRound = (game.round + offset) % animals.length;
					if (game.solved[nextRound]) continue;
					game.round = nextRound;
					setQuestion(runtime);
					return;
				}
			}, correctAnswerDelayMs);
		}
	} else {
		setTimeout(() => {
			if (!game || game.token !== token) return;
			card.animationFrame = selected * 3;
		}, 900);
	}
}

function changeQuestion(runtime, direction) {
	if (game.menuOpen || game.complete) return;
	const nextRound = game.round + direction;
	if (nextRound < 0 || nextRound >= animals.length) return;
	void playSound("click");
	game.token++;
	game.round = nextRound;
	setQuestion(runtime);
}

function toggleMenu(runtime) {
	if (game.complete) return;
	game.menuOpen = !game.menuOpen;
	const panel = runtime.getInstanceByUid(130);
	panel.animationFrame = 0;
	panel.isVisible = game.menuOpen;
	runtime.getInstanceByUid(131).isVisible = false;
}

async function shareGame() {
	const payload = {
		title: "Canlılarda Sindirim Çeşitleri ve Yapıları",
		text: "Sindirim özelliklerine bakarak canlıyı bul!",
		url: location.href
	};
	try {
		if (navigator.clipboard && navigator.maxTouchPoints === 0) {
			await navigator.clipboard.writeText(`${payload.text} ${payload.url}`);
		} else if (navigator.share) {
			await navigator.share(payload);
		} else {
			await navigator.clipboard.writeText(`${payload.text} ${payload.url}`);
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
	if (hit(x, y, 1420, 70, 99, 100)) {
		void playSound("click");
		return startGame(runtime);
	}
	if (hit(x, y, 1528, 70, 99, 100)) {
		soundEnabled = !soundEnabled;
		masterGain.gain.value = soundEnabled ? 1 : 0;
		runtime.getInstanceByUid(20).animationFrame = soundEnabled ? 1 : 0;
		void playSound("click", true);
		return;
	}
	if (hit(x, y, 1636, 70, 99, 100)) {
		void playSound("click");
		return toggleMenu(runtime);
	}
	if (hit(x, y, 1744, 70, 99, 100)) {
		void playSound("click");
		return void shareGame();
	}
	if (hit(x, y, 1852, 70, 99, 100)) {
		void playSound("click");
		return void toggleFullscreen(runtime);
	}
	if (game.complete) {
		if (runtime.getInstanceByUid(130).isVisible && hit(x, y, 960, 721, 360, 75)) {
			void playSound("click");
			startGame(runtime);
		}
		return;
	}
	if (game.menuOpen) {
		if (hit(x, y, 960, 721, 360, 75) || !hit(x, y, 960, 540, 900, 512)) {
			void playSound("click");
			toggleMenu(runtime);
		}
		return;
	}
	if (hit(x, y, 95, 813, 84, 84)) return changeQuestion(runtime, -1);
	if (hit(x, y, 1825, 813, 84, 84)) return changeQuestion(runtime, 1);
	for (let i = 0; i < 4; ++i) {
		if (hit(x, y, 382 + 385 * i, 813, 362, 362)) {
			answer(runtime, i);
			return;
		}
	}
}

runOnStartup(async runtime => {
	prepareSounds(runtime);
	runtime.addEventListener("afteranylayoutstart", event => {
		if (event.layout.name === "game") startGame(runtime);
	});
	runtime.addEventListener("pointerdown", event => onPointer(runtime, event));
	document.addEventListener("fullscreenchange", () => {
		if (game && runtime.layout.name === "game")
			runtime.getInstanceByUid(21).animationFrame = document.fullscreenElement ? 1 : 0;
	});
});
