import { Schema, defineTypes, MapSchema, ArraySchema } from "@colyseus/schema";

export class StarboardObject extends Schema {
    constructor(data = {}) {
        super();
        this.assign(data);
    }

    assign(data) {
        if (data.id !== undefined) this.id = data.id;
        if (data.tool !== undefined) this.tool = data.tool;
        if (data.layerId !== undefined) this.layerId = data.layerId;
        if (data.userId !== undefined) this.userId = data.userId;
        if (data.x !== undefined) this.x = data.x;
        if (data.y !== undefined) this.y = data.y;
        if (data.width !== undefined) this.width = data.width;
        if (data.height !== undefined) this.height = data.height;
        if (data.stroke !== undefined) this.stroke = data.stroke;
        if (data.strokeWidth !== undefined) this.strokeWidth = data.strokeWidth;
        if (data.fill !== undefined) this.fill = data.fill;
        if (data.points) {
            if (!this.points) this.points = new ArraySchema();
            else this.points.clear();
            data.points.forEach(p => this.points.push(p));
        } else if (!this.points) {
            this.points = new ArraySchema();
        }
        if (data.text !== undefined) this.text = data.text;
        if (data.src !== undefined) this.src = data.src;
        if (data.tension !== undefined) this.tension = data.tension;
        if (data.lineCap !== undefined) this.lineCap = data.lineCap;
        if (data.lineJoin !== undefined) this.lineJoin = data.lineJoin;
        if (data.globalCompositeOperation !== undefined) this.globalCompositeOperation = data.globalCompositeOperation;
        if (data.fontSize !== undefined) this.fontSize = data.fontSize;
        if (data.fontStyle !== undefined) this.fontStyle = data.fontStyle;
    }
}
defineTypes(StarboardObject, {
    id: "string",
    tool: "string",
    layerId: "string",
    userId: "string",
    x: "number",
    y: "number",
    width: "number",
    height: "number",
    stroke: "string",
    strokeWidth: "number",
    fill: "string",
    points: ["number"],
    text: "string",
    src: "string",
    tension: "number",
    lineCap: "string",
    lineJoin: "string",
    globalCompositeOperation: "string",
    fontSize: "number",
    fontStyle: "string",
});

export class StarboardPlayer extends Schema {
    constructor(id, name, color) {
        super();
        this.id = id;
        this.name = name;
        this.color = color;
        this.nx = 0;
        this.ny = 0;
    }
}
defineTypes(StarboardPlayer, {
    id: "string",
    name: "string",
    color: "string",
    nx: "number",
    ny: "number",
});

export class StarboardState extends Schema {
    constructor() {
        super();
        this.objects = new MapSchema();
        this.players = new MapSchema();
    }
}
defineTypes(StarboardState, {
    objects: { map: StarboardObject },
    players: { map: StarboardPlayer },
});
