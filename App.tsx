import React, {useEffect, useState} from 'react';
import {View, Text, ScrollView} from 'react-native';
import axios from 'axios';
import NfcManager, {
  ByteParser,
  NfcTech,
  NfcEvents,
} from 'react-native-nfc-manager';
import CardCheck from './src/Taps';

const App = () => {
  const [token, setToken] = useState<string | null>(null);
  const [nfcProps, setNfcProps] = useState({
    supported: false,
    enabled: false,
    mode: 'balance',
    isDetecting: false,
  });

  useEffect(() => {
    NfcManager.isSupported(NfcTech.MifareClassic).then(supported => {
      if (supported) {
        NfcManager.start()
          .then(() => NfcManager.isEnabled())
          .then(enabled => {
            setNfcProps({...nfcProps, enabled, supported: true});
            // startDetection();
          })
          .catch(err => {
            console.warn('starting error', err);
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

  const getToken = async () => {
    try {
      const res = await axios.post(
        'https://card-city.tapandgoticketing.co.rw/api/v1/operators/login',
        {username: 'support@acgroup.rw', password: 'Kigali@123'},
      );
      console.log({token: res.data.data.token});
      setToken(res.data.data.token);
    } catch (error) {
      console.log({error: error.message});
    }
  };

  useEffect(() => {
    getToken();
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

      const parsedText = ByteParser.byteToHexString(tag);
      console.log('---text--text=-->', parsedText);
      const partLength = parsedText.length / 4;

      const part1 = parsedText.substr(0, partLength);
      const part2 = parsedText.substr(partLength, partLength);
      const part3 = parsedText.substr(partLength * 2, partLength);

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

      const textParsed = byteToHexString(data);
      console.log({textParsed});

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
        'https://card-city.tapandgoticketing.co.rw/api/v1/card-pay',
        {card_number: tag.id},
        {
          headers: {
            'x-auth': token,
          },
        },
      );

      console.log({sessionData: JSON.stringify(sessionData.data, null, 2)});

      const sectors =
        sessionData.data.data.session_data.content.command.authInfo.sectors;
      const clientSessionId =
        sessionData.data.data.session_data.header.clientSessionId;
      const serverSessionId =
        sessionData.data.data.session_data.header.serverSessionId;
      console.log({sectors, clientSessionId, serverSessionId});
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
        // if (KEY === KeyTypes[0]) {
        //   await NfcManager.mifareClassicAuthenticateA(sec.no, key);
        // }
        await NfcManager.mifareClassicAuthenticateB(sec.no, key);

        const sectorBlocks = await read(sec.no);

        sectorData.push({
          no: sec.no,
          // blocksInSector,
          // firstBlockData: firstBlockInSector,
          blocks: sectorBlocks,
        });
      }
      const cardChargeData = await axios.post(
        'https://card-city.tapandgoticketing.co.rw/api/v1/card-pay-complete',
        {
          card_number: tag.id,
          amount: 17,
          session_data: {
            header: {
              clientSessionId,
              serverSessionId,
            },
          },
          card_command: {sectors: sectorData},
        },
        {
          headers: {
            'x-auth': token,
          },
        },
      );
      console.log(
        '==card-data==>',
        JSON.stringify(cardChargeData.data, null, 2),
      );

      const retunedSectors =
        cardChargeData.data.data.card_content.command.sectors;
      const writtenData = await write(
        retunedSectors[0].no,
        retunedSectors[0]?.blocks[0].data,
      );
      console.log({writtenData});
      const writtenData1 = await write(
        retunedSectors[0].no,
        retunedSectors[0]?.blocks[0].data,
      );
      console.log({writtenData1});
    }
    await cleanUp();
  };

  return (
    <ScrollView style={{flex: 1, backgroundColor: '#000'}}>
      {console.log({nfcProps})}
      {nfcProps.supported ? (
        <CardCheck startDetection={startDetection} />
      ) : (
        <View>
          <Text style={{color: '#fff'}}>Your device does not support nfc</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default App;
