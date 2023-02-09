// url of tarred DZI
const tarUrl = "https://data-proxy.ebrains.eu/api/v1/permalinks/c708f5c2-75e7-4e51-bb9f-6175541b1cea"
// url of index file
const indexUrl = "https://data-proxy.ebrains.eu/api/v1/permalinks/b09aa4dc-4e9c-48eb-a246-4b1ed482c9ac"

// get index file and save to variable

// function to search index file for file name
function ReturnIndexAndSize(fileName, tarIndex) {
    file = tarIndex.map((line) => {
        if (line.startsWith(fileName)) {
            // return line and previous line
            return line;
        }
    });
    // remove empty lines 
    file = file.filter((line) => {
        return line != undefined;
    });
    // split line into array
    file = file[0].split(' ');
    fileIndex = file[1];
    fileSize = file[2];
    return [fileIndex, fileSize];
}

function DZItoTar(tarUrl, indexUrl, fileName) {
    DZIchunk = fetch(indexUrl).then(response => response.text()).then(tarindex => {
        // split indexfile.index into lines
        tarindex = tarindex.split('\n');
        // find where index starts with output_image_files/14/40_16.tif 
        fileIndexAndSize = ReturnIndexAndSize(fileName, tarindex);
        fileIndex = parseInt(fileIndexAndSize[0]);
        fileSize = parseInt(fileIndexAndSize[1]);
        console.log(fileIndex);
        console.log(fileSize);
        // read bytes from remote tar file at url

        fetch(tarUrl, {
            headers: {
                'content-type': 'multipart/byteranges',
                'Range': 'bytes=' + fileIndex + '-' + (fileIndex + fileSize)
            }
        }).then(response => {
            console.log('fetched');
            // fs write file
            // get reponse as binary
            response.arrayBuffer().then(ArrayBuff => {
                // convert to buffer
                const buffer = Buffer.from(ArrayBuff);
                // convert bufer to base64
                const base64 = buffer.toString('base64');
                // convert to png
                return base64

                // write file for testing
                // const writeStream = fs.createWriteStream('output_test_web.tif');
                // writeStream.write(buffer);
                // writeStream.end();
            });
        });
    });
    return DZIchunk;
}
exports.DZItoTar = DZItoTar;