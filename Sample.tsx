
import React, {useState, useEffect} from 'react';
import axios from 'axios';
import {View, Text, Platform, TouchableOpacity, ScrollView} from 'react-native';
import NfcManager, {
  ByteParser,
  NfcTech,
  NfcEvents,
} from 'react-native-nfc-manager';

const KeyTypes = ['A', 'B'];

const KEY = KeyTypes[1];
const KEY_TO_USE = 'C7737C6FB965';
const SECTOR_TO_WRITE = 5;
const TEXT_TO_WRITE = 'Hello World!';

// const sectors = [
//   {
//     no: 3,
//     keyType: 'B',
//     key: 'C7737C6FB965',
//   },
//   {
//     no: 4,
//     keyType: 'B',
//     key: 'C7737C6FB965',
//   },
//   {
//     no: 5,
//     keyType: 'B',
//     key: 'C7737C6FB965',
//   },
//   {
//     no: 6,
//     keyType: 'B',
//     key: 'C7737C6FB965',
//   },
// ];

const App = () => {
  const [nfcProps, setNfcProps] = useState({
    supported: false,
    enabled: false,
    isDetecting: false,
    mode: 'read',
    tag: null,
    sectorCount: null,
    blocksInSector: null,
    parsedText: null,
    firstBlockInSector: null,
  });
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    NfcManager.isSupported(NfcTech.MifareClassic).then(supported => {
      if (supported) {
        _startNfc();
        NfcManager.start()
          .then(() => NfcManager.isEnabled())
          .then(enabled => setNfcProps({...nfcProps, enabled, supported: true}))
          .catch(err => {
            console.warn(err);
            setNfcProps({...nfcProps, enabled: false});
          });
        NfcManager.setEventListener(NfcEvents.DiscoverTag, tag => {
          console.warn('tag', JSON.stringify(tag, null, 2));
          NfcManager.setAlertMessageIOS('I got your tag!');
          NfcManager.unregisterTagEvent().catch(() => 0);
        });
      }
    });

    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => 0);
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      NfcManager.unregisterTagEvent().catch(() => 0);
    };
  }, []);

  

  const startDetection = async () => {
    const cleanUp = async () => {
      await NfcManager.cancelTechnologyRequest();
    };

    console.log('===starting detection===>');

    const byteToHexString = bytes => {
      if (!Array.isArray(bytes) || !bytes.length) return '';
      let result = '';
      for (let i = 0; i < bytes.length; i++) {
        result += `0${bytes[i].toString(16)}`.slice(-2);
      }
      return result;
    };
    const read = async sector => {
      const blocksInSector =
        await NfcManager.mifareClassicGetBlockCountInSector(parseInt(sector));
      console.log('===step 2 of detection===>', blocksInSector);
      const tag = await NfcManager.mifareClassicReadSector(parseInt(sector));
      const block = await NfcManager.mifareClassicSectorToBlock(
        parseInt(sector),
      );

      // console.log('====step 3 of detection===>', JSON.stringify(tag, null, 2));

      const parsedText = ByteParser.byteToHexString(tag);
      console.log('---text--text=-->', parsedText);
      const partLength = parsedText.length / 4;

      // Use substr to split the string into four equal parts
      const part1 = parsedText.substr(0, partLength);
      const part2 = parsedText.substr(partLength, partLength);
      const part3 = parsedText.substr(partLength * 2, partLength);
      // const part4 = parsedText.substr(partLength * 3, partLength);

      // Store the parts in an array
      const partsArray = [part1, part2, part3].map((item, idx) => ({
        no: idx,
        data: item.toUpperCase(),
      }));

      console.log(partsArray);

      console.log('===blocks===>', block);

      const data = await NfcManager.mifareClassicReadBlock(block);

      console.log({data});
      console.log('===parsed-data==>', byteToHexString(data));
      console.log('---data-to-check--->', ByteParser.byteToString(data));

      // const textParsed = ByteParser.byteToString(data);
      const textParsed = byteToHexString(data);
      console.log({textParsed});

      // console.log({});

      return partsArray;
    };

    const hexStringToByteArray = hexString => {
      const byteArray = [];

      for (let i = 0; i < hexString.length; i += 2) {
        byteArray.push(parseInt(hexString.substr(i, 2), 16));
      }

      return byteArray;
    };

    const write = async (sector, text) => {
      console.log('===started writing===>', text);

      const block = await NfcManager.mifareClassicSectorToBlock(
        parseInt(sector),
      );

      console.log('===got the block==<', block);
      // Create 1 block
      // const data = [];
      // for (let i = 0; i < NfcManager.MIFARE_BLOCK_SIZE; i++) {
      //   data.push(0);
      // }

      // console.log('===got data to put====>', data);
      // // Fill the block with our text, but don't exceed the block size
      // for (
      //   let i = 0;
      //   i < TEXT_TO_WRITE.length && i < NfcManager.MIFARE_BLOCK_SIZE;
      //   i++
      // ) {
      //   data[i] = parseInt(text.charCodeAt(i));
      // }

      const arrayText = hexStringToByteArray(text);

      console.log({arrayText});

      const data = await NfcManager.mifareClassicWriteBlock(block, arrayText);
      // return await read(sector);
      return data;
    };

    setNfcProps({...nfcProps, isDetecting: true});

    await NfcManager.registerTagEvent();
    await NfcManager.requestTechnology(NfcTech.MifareClassic);

    let sectorData = [];
    const tag = await NfcManager.getTag();
    console.log({tag});
    if (tag.id) {
      const sessionData = await axios.post(
        'https://kigali-service-api.tapandgoticketing.co.rw/api/cards/session',
        {cardNumber: tag.id},
      );

      console.log({sessionData: JSON.stringify(sessionData.data, null, 2)});

      const sectors = sessionData.data.content.command.authInfo.sectors;
      const clientSessionId = sessionData.data.header.clientSessionId;
      const serverSessionId = sessionData.data.header.serverSessionId;

      for (let sec of sectors) {
        // console.log('---key--->', sec);
        // console.log('===inside the map===>');
        // console.log('====supposed to be 2===>', JSON.stringify(tag, null, 2));
        // const sectorCount = await NfcManager.mifareClassicGetSectorCount();
        // console.log('====now this can be 3===>', sectorCount);
        // Convert the key to a UInt8Array
        const key = [];
        for (let i = 0; i < sec.key.length - 1; i += 2) {
          key.push(parseInt(sec.key.substring(i, i + 2), 16));
        }

        console.log({key});
        if (KEY === KeyTypes[0]) {
          await NfcManager.mifareClassicAuthenticateA(sec.no, key);
        }
        await NfcManager.mifareClassicAuthenticateB(sec.no, key);

        const sectorBlocks = await read(sec.no);

        sectorData.push({
          no: sec.no,
          // blocksInSector,
          // firstBlockData: firstBlockInSector,
          blocks: sectorBlocks,
        });

        // console.log({blocksInSector, firstBlockInSector});
      }
      // console.log('sectorData', JSON.stringify(sectorData, null, 2));
      const cardChargeData = await axios.post(
        'https://kigali-service-api.tapandgoticketing.co.rw/api/cards/payment',
        {
          cardNumber: tag.id,
          amount: 17,
          clientSessionId,
          serverSessionId,
          command: sectorData,
        },
      );
      console.log(
        '==card-data==>',
        JSON.stringify(cardChargeData.data, null, 2),
      );

      const retunedSectors = cardChargeData.data.content.command.sectors;

      // await Promise.all(
      //   retunedSectors.map(async sector => {
      //   }),
      //   );
      const writtedData = await write(
        retunedSectors[0].no,
        retunedSectors[0]?.blocks[0].data,
      );
      console.log({writtedData});
      const writtedData1 = await write(
        retunedSectors[0].no,
        retunedSectors[0]?.blocks[0].data,
      );
      console.log({writtedData1});

      // await NfcManager.getTag();
      // for (let sector of retunedSectors) {
      //   console.log(
      //     '==sectors-t-be-writte===>',
      //     JSON.stringify(sector, null, 2),
      //   );
      //   const writtedData = await write(sector.no, sector?.blocks[0].data);
      //   console.log({writtedData});
      // }
    }
    await cleanUp();
  };

  const _startDetection = async () => {
    const cleanUp = async () => {
      await NfcManager.cancelTechnologyRequest();
    };

    console.log('===starting detection===>');

    const byteToHexString = bytes => {
      if (!Array.isArray(bytes) || !bytes.length) return '';
      let result = '';
      for (let i = 0; i < bytes.length; i++) {
        result += `0${bytes[i].toString(16)}`.slice(-2);
      }
      return result;
    };
    const read = async () => {
      const blocksInSector =
        await NfcManager.mifareClassicGetBlockCountInSector(
          parseInt(SECTOR_TO_WRITE),
        );
      console.log('===step 2 of detection===>', blocksInSector);
      const tag = await NfcManager.mifareClassicReadSector(
        parseInt(SECTOR_TO_WRITE),
      );

      console.log('====step 3 of detection===>', JSON.stringify(tag, null, 2));

      const parsedText = ByteParser.byteToHexString(tag);

      const block = await NfcManager.mifareClassicSectorToBlock(
        parseInt(SECTOR_TO_WRITE),
      );

      console.log('===blocks===>', block);

      const data = await NfcManager.mifareClassicReadBlock(block);

      console.log({data});
      console.log('===parsed-data==>', byteToHexString(data));

      const textParsed = ByteParser.byteToString(data);
      console.log({textParsed});

      console.log({
        blocksInSector,
        firstBlockInSector: textParsed,
        parsedText,
      });

      return {
        blocksInSector,
        firstBlockInSector: textParsed,
        parsedText,
      };
    };

    const write = async () => {
      const block = await NfcManager.mifareClassicSectorToBlock(
        parseInt(SECTOR_TO_WRITE),
      );
      // Create 1 block
      const data = [];
      for (let i = 0; i < NfcManager.MIFARE_BLOCK_SIZE; i++) {
        data.push(0);
      }

      // Fill the block with our text, but don't exceed the block size
      for (
        let i = 0;
        i < TEXT_TO_WRITE.length && i < NfcManager.MIFARE_BLOCK_SIZE;
        i++
      ) {
        data[i] = parseInt(TEXT_TO_WRITE.charCodeAt(i));
      }

      await NfcManager.mifareClassicWriteBlock(block, data);
      return read();
    };

    setNfcProps({...nfcProps, isDetecting: true});

    await NfcManager.registerTagEvent();
    await NfcManager.requestTechnology(NfcTech.MifareClassic);
    const tag = await NfcManager.getTag();
    console.log('====supposed to be 2===>', JSON.stringify(tag, null, 2));
    const sectorCount = await NfcManager.mifareClassicGetSectorCount();
    console.log('====now this can be 3===>', sectorCount);

    // Convert the key to a UInt8Array
    const key = [];
    for (let i = 0; i < KEY_TO_USE.length - 1; i += 2) {
      key.push(parseInt(KEY_TO_USE.substring(i, i + 2), 16));
    }

    console.log({key});

    if (KEY === KeyTypes[0]) {
      await NfcManager.mifareClassicAuthenticateA(SECTOR_TO_WRITE, key);
    }
    await NfcManager.mifareClassicAuthenticateB(SECTOR_TO_WRITE, key);

    const {blocksInSector, parsedText, firstBlockInSector} =
      nfcProps.mode === 'read' ? await read() : await write();

    await cleanUp();
    setNfcProps({
      ...nfcProps,
      blocksInSector,
      parsedText,
      firstBlockInSector,
      sectorCount,
      tag,
      isDetecting: false,
    });
  };

  const _stopDetection = () => {
    NfcManager.cancelTechnologyRequest()
      .then(() => setNfcProps({...nfcProps, isDetecting: false}))
      .catch(err => console.warn(err));
  };

  const _startNfc = () => {
    NfcManager.start()
      .then(() => NfcManager.isEnabled())
      .then(enabled => setNfcProps({...nfcProps, enabled}))
      .catch(err => {
        console.warn('start-error', JSON.stringify(err, null, 2));
        setNfcProps({...nfcProps, enabled: false});
      });
  };

  const _clearMessages = () => {
    setNfcProps({
      ...nfcProps,
      tag: null,
      sectorCount: null,
      blocksInSector: null,
      parsedText: null,
      firstBlockInSector: null,
    });
  };

  return (
    <ScrollView style={{flex: 1}}>
      {Platform.OS === 'ios' && <View style={{height: 60}} />}

      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>{`Is MifareClassic supported ? ${nfcProps.supported}`}</Text>
        <Text>{`Is NFC enabled (Android only)? ${nfcProps.enabled}`}</Text>

        {!nfcProps.isDetecting && (
          <TouchableOpacity
            style={{margin: 10}}
            onPress={() => startDetection()}>
            <Text style={{color: 'blue', textAlign: 'center', fontSize: 20}}>
              {`CLICK TO START DETECTING ${
                nfcProps.mode === 'read' ? 'READ' : 'WRITE'
              }`}
            </Text>
          </TouchableOpacity>
        )}

        {nfcProps.isDetecting && (
          <TouchableOpacity
            style={{margin: 10}}
            onPress={() => _stopDetection()}>
            <Text style={{color: 'red', textAlign: 'center', fontSize: 20}}>
              {`CLICK TO STOP DETECTING ${
                nfcProps.mode === 'read' ? 'READ' : 'WRITE'
              }`}
            </Text>
          </TouchableOpacity>
        )}

        {
          <View
            style={{
              padding: 10,
              marginTop: 20,
              backgroundColor: '#e0e0e0',
            }}>
            <View style={{flexDirection: 'row'}}>
              <TouchableOpacity
                style={[
                  {flex: 1, alignItems: 'center'},
                  nfcProps.mode === 'read'
                    ? {backgroundColor: '#cc0000'}
                    : {backgroundColor: '#d0d0d0'},
                ]}
                onPress={() =>
                  setNfcProps({
                    ...nfcProps,
                    tag: null,
                    mode: 'read',
                    sectorCount: null,
                    blocksInSector: null,
                    parsedText: null,
                    firstBlockInSector: null,
                  })
                }>
                <Text>READ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  {flex: 1, alignItems: 'center'},
                  nfcProps.mode !== 'read'
                    ? {backgroundColor: '#cc0000'}
                    : {backgroundColor: '#d0d0d0'},
                ]}
                onPress={() =>
                  setNfcProps({
                    ...nfcProps,
                    tag: null,
                    mode: 'write',
                    sectorCount: null,
                    blocksInSector: null,
                    parsedText: null,
                    firstBlockInSector: null,
                  })
                }>
                <Text>WRITE</Text>
              </TouchableOpacity>
            </View>

            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={{marginRight: 35}}>Key (hex): {KEY_TO_USE}</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={{marginRight: 10}}>
                Sector (0-15): {SECTOR_TO_WRITE}
              </Text>
            </View>
            {nfcProps.mode !== 'read' && (
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={{marginRight: 15}}>
                  Text to write: {TEXT_TO_WRITE}
                </Text>
              </View>
            )}
          </View>
        }

        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            marginTop: 20,
          }}>
          <Text>{`Original tag content:`}</Text>
          <Text style={{marginTop: 5, color: 'grey'}}>{`${
            nfcProps.tag
              ? `${JSON.stringify(nfcProps.tag)} (${
                  nfcProps.sectorCount
                } sectors)`
              : '---'
          }`}</Text>
          {nfcProps.parsedText && (
            <Text
              style={{
                marginTop: 5,
              }}>{`Parsed Text:\n${nfcProps.parsedText}`}</Text>
          )}
          {nfcProps.firstBlockInSector && (
            <Text
              style={{
                marginTop: 5,
              }}>{`First block in sector:\n${nfcProps.firstBlockInSector} [${nfcProps.blocksInSector} blocks]`}</Text>
          )}
        </View>

        <TouchableOpacity
          style={{marginTop: 20, alignItems: 'center'}}
          onPress={_clearMessages}>
          <Text style={{color: 'blue'}}>Clear above message</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default App;
