import { EventId, QueryEventsParams, SuiObjectResponse } from "@mysten/sui/client";
import { innerProfilesTableAddy, kp_import_0, OGAddy, packageAddy, suiClient } from ".";
import { Transaction } from "@mysten/sui/transactions";

export interface Profile {
  profilePicUrl?: string,
  username?: string,
  points?: number
};

class ChainUtility{

  allAddys = new Set<string>();
  allProfiles = new Map<string, Profile>();
  currentOnline = new Map<string, number>();

    public async getProfile (addy: String): Promise<Profile> {
        let data: Profile = {};
        await suiClient.getDynamicFieldObject({
            parentId: innerProfilesTableAddy!,
            name: {
                type: 'address',
                value: addy,
            },
        }).then((data2) => {
            if(data2!.data){
                let tmp = (data2!.data!.content! as any).fields.value.fields;
                console.log(tmp);
    
                data = {username: tmp.username, points: parseInt(tmp.trophies), profilePicUrl: tmp.image_url};
            }
        }).catch(e => console.log(e));
        return data;
    };

    public async GetObjectContents (id: string): Promise<any> {
        let data: SuiObjectResponse = {};
        let dataSet = false;
        await suiClient.getObject(
            {
                id: id,
                options: {
                    showContent: true,
                    showOwner: true
                }}
        ).then((data2) => {
            data = data2;
            // console.log(data2);
            dataSet = true;
        }).catch(error => {
            console.log("GetObjectContents Error: " + error.status);
      });
        return dataSet && data?.data?.content ? {data: (data?.data?.content as any)["fields"], version: data.data?.owner} : {data: [], version: ""};
    };
  
  public async sendTransaction (txb: Transaction) {
    const bytes = await txb.build(
      {client: suiClient}
    );
    const serializedSignature = (await kp_import_0.signTransaction(bytes)).signature;
    let res = suiClient.executeTransactionBlock({
      transactionBlock: bytes,
      signature: serializedSignature,
    });
    return res;
  }
  
   public async fetchEvents (eventType: string, OG: boolean) {
      try {
        let queryParams: QueryEventsParams = {
          query: {MoveEventType: `${(OG ? OGAddy : packageAddy)}::${eventType}`},
          order: "descending",
          limit: 10,
        };
        const response = await suiClient.queryEvents(queryParams);
      const responseData = [...response.data];
        return responseData || [];
      } catch (e) {
        console.log('fetchingEvents Error:' + (e! as any).status);
      }
    };
}

export default ChainUtility;
