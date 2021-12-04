import { Config } from "../../types";
import eris, {Constants} from 'eris';
import pluris from 'pluris';
import mongoose, {CallbackWithoutResult} from 'mongoose';
import { Collection, Command, Event, Util, Server } from '.';

// @ts-ignore
pluris(eris)

export default class Client extends (eris.Client) {
    public config: Config;

    public commands: Collection<Command>;

    public events: Collection<Event>;

    public intervals: Collection<NodeJS.Timeout>;

    public server: Server;

    public util: Util;

    constructor(token: string, options?: eris.ClientOptions) {
        super(token, options);
        this.commands = new Collection<Command>();
        this.events = new Collection<Event>();
        this.intervals = new Collection<NodeJS.Timeout>();
        // this.server = new Server(this)
        this.util = new Util(this);
        this.server = new Server(this, 8123);

    }

    public async connectDb() {
        // @ts-ignore
        await mongoose.connect(this.config.mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});
    }

    public async loadCommands(commandFiles) {
        const cmdFiles = Object.values<typeof Command>(commandFiles);
        for (const cmd of cmdFiles) {
            const comm = new cmd(this);
            if (comm.subcmds.length) {
                for (const C of comm.subcmds) {
                    const Cmd: Command = new C(this)
                    comm.subcommands.add(Cmd.name, Cmd)
                    this.util.signale.success(`Loaded sub-command ${comm.name} ${Cmd.name}`)
                }
            }
            delete comm.subcmds;
            this.commands.add(comm.name, comm);
            if (comm.slashCommand) {
                await this.guilds.get('873559786833199186').createCommand({
                    name: comm.name,
                    description: comm.description,
                    type: Constants.ApplicationCommandTypes.CHAT_INPUT
                })
            };
            this.util.signale.success(`Loaded ${comm.name} command.`);
        }
    }

    public async loadEvents(eventFiles: any) {
        const evntFiles = Object.entries<typeof Event>(eventFiles);
        for (const [name, ev] of evntFiles) {
            const event = new ev(this)
            this.events.add(event.event, event);
            this.on(event.event, event.run)
            this.util.signale.success(`Loaded ${name} event.`)
            delete require.cache[require.resolve(`${__dirname}/../events/${name}`)];
        }
    }
}