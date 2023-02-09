// import node-fetch
const fetch = require('node-fetch');
// import text decoder
const { TextDecoder } = require('util');
// set zipUrl as the url of the dzip file
const inflate = require('./inflator.js').inflate;
// get the index file 
// fetch request with range bytes -22
function netunzip(zipUrl) {
    return new Promise((resolve, reject) => {
        fetch(zipUrl, 
            {
            headers: {
                'Range': 'bytes=-22'
            }
        }
            ).then((response) => response.arrayBuffer()).then((buffer) => new DataView(buffer)).then((dataView) => {
            if (dataView.getUint32(0, true) != 0x06054b50) {
                throw new Error("Not a zip file");
            }
            else {
                // create a new Map() to hold the entries
                const entries = new Map();
                // get the dirsize from the dataView
                const dirsize = dataView.getUint32(12, true);
                // get the diroffset from the dataView
                const diroffset = dataView.getUint32(16, true);
                // log the entries, dirsize and diroffset to the console
                // console.log('entries', entries);
                // console.log('dirsize', dirsize);
                // console.log('diroffset', diroffset);
                // fetch request with range bytes dirsize, diroffset
                let pos = 0;
                // create new text decoder
                const tdec = new TextDecoder();
                fetch(zipUrl,
                    {
                        headers: {
                            'Range': `bytes=${diroffset}-${diroffset + dirsize - 1}`
                        }
                    }
                ).then((response) => response.arrayBuffer())
                .then((dirbuf) => {
                    while (pos < dirbuf.byteLength) {
                        const view = new DataView(dirbuf, pos);
                        pos += 46;
                        if (view.getUint32(0, true) !== 0x02014b50) {
                            throw new Error("Invalid central directory");
                        }
                        const timecode = view.getUint16(12, true);
                        const hour = timecode >> 11;
                        const minute = (timecode >> 5) & 63;
                        const second = (timecode & 31) * 2;
                        const datecode = view.getUint16(14, true);
                        const year = (datecode >> 9) + 1980;
                        const month = (datecode >> 5) & 15;
                        const day = datecode & 31;
                        const entry = {
                            vermade: view.getUint16(4, true),
                            verext: view.getUint16(6, true),
                            gpflags: view.getUint16(8, true),
                            method: view.getUint16(10, true),
                            timestamp: new Date(year, month, day, hour, minute, second),
                            crc: view.getUint32(16, true),
                            compsize: view.getUint32(20, true),
                            uncompsize: view.getUint32(24, true),
                            namelength: view.getUint16(28, true),
                            extralength: view.getUint16(30, true),
                            commentlength: view.getUint16(32, true),
                            diskno: view.getUint16(34, true),
                            intattrs: view.getUint16(36, true),
                            extattrs: view.getUint32(38, true),
                            offset: view.getUint32(42, true)
                        };
                        entry.name = tdec.decode(new Uint8Array(dirbuf, pos, entry.namelength));
                        pos += entry.namelength;
                        entry.extra = new Uint8Array(dirbuf, pos, entry.extralength);
                        pos += entry.extralength;
                        entry.comment = tdec.decode(new Uint8Array(dirbuf, pos, entry.commentlength));
                        pos += entry.commentlength;
                        // console.log('entry', entry)
                        entries.set(entry.name, entry);
                    }
            
                    resolve(
                        {
                            entries,
                            async get(entry, raw) {
                                const m = entry.method;
                                if (!raw && m !== 0 && m !== 8)
                                    throw `Unsupported compression method ${m}.`;
                                // const localhead = new DataView(await fetch(await urlfunc(), {headers: {range: `bytes=${entry.offset}-${entry.offset + 30 - 1}`}}).then(response => response.arrayBuffer()));
                                // rewrite the above line to be compatible with node-fetch
                                const localhead = new DataView(await fetch(zipUrl, {headers: {range: `bytes=${entry.offset}-${entry.offset + 30 - 1}`}}).then(response => response.arrayBuffer()));
                                if (localhead.getUint32(0, true) !== 0x04034b50)
                                    throw "0x04034b50, local file signature not found, file may be damaged.";
                                const method = localhead.getUint16(8, true);
                                if (!raw && method !== 0 && m !== 8)
                                    throw `Unsupported compression method ${m}. Sus.`;
                                const compsize = localhead.getUint32(18, true);
                                const uncompsize = localhead.getUint32(22, true);
                                const namelength = localhead.getUint16(26, true);
                                const extralength = localhead.getUint16(28, true);
                                const dataoffset = entry.offset + 30 + namelength + extralength;
                                // const rawdata = new Uint8Array(await fetch(await urlfunc(), {headers: {range: `bytes=${dataoffset}-${dataoffset + compsize - 1}`}}).then(response => response.arrayBuffer()));
                                // rewrite the above line to be compatible with node-fetch
                                const rawdata = new Uint8Array(await fetch(zipUrl, {headers: {range: `bytes=${dataoffset}-${dataoffset + compsize - 1}`}}).then(response => response.arrayBuffer()));
                                return raw || m === 0 ? rawdata : inflate(rawdata, 0, uncompsize);
                            }
                        }
                    );  
                
                });
            }
        });
    });
}

exports.netunzip = netunzip;