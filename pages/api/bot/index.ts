// 기본호출주소: http://localhost:3000/api/bot
// next 패키지내에 클라이어트 요청과 서버 응답객체의 타입 참조하기
import type { NextApiRequest, NextApiResponse } from 'next';

//OpenAI LLM 패키지 참조하기
import { ChatOpenAI } from '@langchain/openai';


//메시지 인터페이스 타입 참조하기
import { IMemberMessage, UserType } from '@/interfaces/message';

//LangChain에서 제굥하는 시스템멤시지(역할기반챗봇지정)과 휴면메시지타입 참조하기
//SystemMessage: LLM챗봇에게 역할을 지정할 때 사용하는 메시지
//HumanMessage: LLM챗봇에 전달할 사용자메시지 타입, 의 입력 메시지
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';

//프롬프트 템플릿 참조하기
import { ChatPromptTemplate } from '@langchain/core/prompts';

//LLM 응답메시지 타입을 원하는 타입결과물로 파싱(변환)해주는 아웃풋파서 참조하기
//StringOutputParser는 AIMessage 타입에서 content 속성값만 문자열로 변환해주는 파서임.
import { StringOutputParser } from '@langchain/core/output_parsers';  

//대화이력 기반 챗봇 구현을 위한 각종 객체 참조하기
//챗봇과의 대화이력 정보 관리를 위한 메모리 기간 InMemoryChatMessageHistory 객체 참조하기
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';

//대화이력 관리를 위한 세부 주요 객체 참조하기
import { 
  RunnableWithMessageHistory, 
  RunnablePassthrough, 
  RunnableSequence 
} from '@langchain/core/runnables';  


//백엔드에서 프론트엔드로 전달할 겨과 데이터 정의하기
type ResponseData = {
  code: number;
  data: string | null | IMemberMessage;
  msg: string;
};

//메모리 영역에 실제 대화이력이 저장되는 전역변수 선언 및 구저정의
//RecordString 사용자세션아이디, InMemoryChatMessageHistory : 사용자별 대화이력객체
// const messageHistory: Record<string, InMemoryChatMessageHistory> = {};
const messageHistories: Record<string, InMemoryChatMessageHistory> = {};


//백엔드 REST API 기능을 제공해주는 처리함수 구현하기
//req는 클라이언트에서 서버로 제공되는 각종정보를 포함하는 매개변수이고 타입은 NextApiRequest 입니다.
//res는 백엔드 API에서 클라이언트(프론트엔드=앱브라우저)로 전달할 결과값을 처리하는 객체입니다.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  // 클라이언트에 전달할 최종 데이터 값 정의하기
  const apiResult: ResponseData = {
    code: 400,
    data: null,
    msg: 'failed',
  };

  try {
    //LLM 챗봇과 통신해서 LLM이 제공해주슨 응답값을 받아서 apiResult data값으로 전달하기
    if (req.method == 'POST') {
      const nickName = req.body.nickName;
      const prompt = req.body.message;

      //step2: LLM모델 생성하기
      const llm = new ChatOpenAI({
        model: 'gpt-4o',
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log('index 채팅창에서 전달받은 prompt : ', prompt);

      // //step3: LLM과 통신하기
      //Case 1: 심플 챗봇
      // const result = await llm.invoke(prompt);
      // return type: AIMessage

      // //Case 2: 역할기반 챗봇
      // const messages = [
      //   new SystemMessage('내가 보낸 메시지를 영어로 번역해줘'), // 시슽멤에게 역할 지정
      //   new HumanMessage(prompt),
      // ];
      // const result = await llm.invoke(messages);

      // //Case 3: 프롬프트 템플릿을 이용한 메시지를 전달하고 응답받기 
      // const promptTemplate = ChatPromptTemplate.fromMessages([
      //   ['system', '내가 보낸 메시지를 영어로 번역해줘'],   // SystemMessage 없으면 일반 채팅, 있으면 역할지정.  역할: 내가 보낸 메시지를 영어로 번역해줘
      //   ['user', '{input}']  // HumanMessage {input}
      // ]);

      // // Case 3-1 : 1개의 체인인 경우 
      // // //여러 개의 체인을 연결해 최종 사용자 질문에 대한 응답을 받는 방법을 LangChain에서는 파이프라인이라고 함.
      // // const chain = promptTemplate.pipe(llm);
      // // const result = await chain.invoke({ input: prompt });

      // //LLM OutputParser 를 이용해 응답메시지를 문자열로 변환하기
      // const outputParser = new StringOutputParser();

      // // Case 3-2 : OutputParser를 이용한 2개의 체인(작업을 순서대로)을 실행하기 
      // const chains = promptTemplate.pipe(llm).pipe(outputParser);
      // // OutputParser를 이용했기 때문에 invoke 결과값이 AIMessage 가 아닌 문자열로 반환됨.  
      // const resultMessage = await chains.invoke({ input: prompt });
      // const resultMsg: IMemberMessage = {
      //   user_type: UserType.BOT,
      //   nick_name: 'Bot',
      //   message: resultMessage,   // message: result.content as string,
      //   send_date: new Date(),
      // };

      //case 4: 대화이력기반 챗봇 프롬프트 템플릿 사용하기
      const promptTemplate = ChatPromptTemplate.fromMessages([
        ['system', '당신은 사용자와의 모든 대화이력을 기억합니다. 마침표로 문장이 끝나면 한줄 뛰어주세요.'], 
        ['placeholder', '{chat_history}'],
        ['human', '{input}']
      ]); 
      //Case 4 : LLM OutputParser 를 이용해 응답메시지를 문자열로 변환하기
      const outputParser = new StringOutputParser();
      // Case 4 : OutputParser를 이용한 2개의 체인(작업을 순서대로)을 실행하기 
      const chains = promptTemplate.pipe(llm).pipe(outputParser);

      // 대화이력관리를 위한 제안생성(대화이력관리작업)
      // RunnableWithMessageHistory(runnable llm모델정보, getMessageHistory:()=>(지정될 사용자의 대화이력반환)),
      // , inputMessageKey: 사용자 입력 프롬프트값 전달, historyMessageKey: 지정된 대화이력정보를 llm에게 전달)
      const historyChain = new RunnableWithMessageHistory({
        runnable: chains,
        getMessageHistory: async (sessionId: string) => {
          // 메모리 영역에 해당 세션 아이디 사용자의 대화이력이 없으면 대화이력관리 객체를 생성해준다.
          if (messageHistories[sessionId] === undefined) {
            messageHistories[sessionId] = new InMemoryChatMessageHistory();
          }
          return messageHistories[sessionId];
        },
        inputMessagesKey: 'input',
        historyMessagesKey: 'chat_history',
      });

      //사용자 세션 아이디 값 구성하기
      //현재 챗봇을 호출한 사용자 아이디 값(nickName)을 세션 아이디로 사용 설정해 준다.
      //추후 프론트엔드에서 전달된 사용자 아이디값을 세션아이디로 값으로 설정해 준다.
      const config = {
        configurable: { sessionId: nickName },
      }

      //대화이력관리 기반 챗봇 llm 모델 호출하기
      //historyChain.invoke({ input: 사용자 입력 메시지 prompt }, config: 현재 접속한 사용자 정보);
      const resultMessage = await historyChain.invoke(
        { input: prompt }, 
        config
      );

      // related to 3-2 방법 
      // const resultMessage = await chains.invoke({ input: prompt }); 

      // result 메시지 타입은 AIMessage 타입으로 변환하기
      // const resultString = result.content as string;
      // console.log('LLM모델에서 전달된 챗봇 응답 결과값: ', result);
      console.log('LLM모델에서 전달된 챗봇 응답 결과값: ', resultMessage);

      //step4: 챗봇 응답 메시지를 프론트엔드 메시지 타입으로 변환하여 결과값 변환하기
      const resultMsg: IMemberMessage = {
        user_type: UserType.BOT,
        nick_name: 'Bot',
        message: resultMessage,   // message: result.content as string,
        send_date: new Date(),
      };

      apiResult.code = 200;
      // apiResult.data = nickName + '님, 무엇을 도와드릴까요.' + prompt;
      apiResult.data = resultMsg;
      apiResult.msg = 'ok';
    }
  } catch (err) {
    //LLM 통신시 에러발생시 에러처리코드 영역
    console.log('index.ts 백엔트 API 호출에러 발생', err);
    apiResult.code = 500;
    apiResult.data = null;
    apiResult.msg = 'failed';
  }
  // 클라이언트에 최종 API결과값을 JSON 형식으로 전달하기
  // res.json(apiResult) 메소드 안에 최종결과 json데이터를 넣어서 클라이언트로 전달합니다.
  res.json(apiResult);
}
