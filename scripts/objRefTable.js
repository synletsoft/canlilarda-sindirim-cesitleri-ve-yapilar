const C3 = self.C3;
self.C3_GetObjectRefTable = function () {
	return [
		C3.Plugins.Sprite
	];
};
self.C3_JsPropNameTable = [
	{refreshBtn: 0},
	{audioBtn: 0},
	{shareBtn: 0},
	{fullScreenBtn: 0},
	{arkaplan: 0},
	{featureCard: 0},
	{animalCard: 0},
	{menuBtn: 0},
	{panel: 0},
	{feedback: 0}
];

self.InstanceType = {
	refreshBtn: class extends self.ISpriteInstance {},
	audioBtn: class extends self.ISpriteInstance {},
	shareBtn: class extends self.ISpriteInstance {},
	fullScreenBtn: class extends self.ISpriteInstance {},
	arkaplan: class extends self.ISpriteInstance {},
	featureCard: class extends self.ISpriteInstance {},
	animalCard: class extends self.ISpriteInstance {},
	menuBtn: class extends self.ISpriteInstance {},
	panel: class extends self.ISpriteInstance {},
	feedback: class extends self.ISpriteInstance {}
}