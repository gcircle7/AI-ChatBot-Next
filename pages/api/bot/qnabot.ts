// 호출주소 : http://localhost:3000/api/bot/qnabot 
import type { NextApiRequest, NextApiResponse } from "next";

// 웹페이지 크롤링을 위한 cheerio 패키지 참조하기
// npm i cheerio  : 웹페이지 문서로딩 오픈소스
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

// 텍스트 분할기 객체 참조하기

// RAG 인덱싱 과정정 중에 다량의 문자열을  특정기준으로 쪼개는 스플릿터 
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

// 스플릿된 청크 문자열을 벡터화한 벡터데이터를 저장하기 위한 저장소로 메모리벡터저장소로 지정하기 
import { MemoryVectorStore } from "langchain/vectorstores/memory";

// 질문을 임베딩(벡터화)하기 위한 LLM 임베딩 모델 참조하기
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

import { ChatPromptTemplate } from "@langchain/core/prompts";

// langChain/hub를 통해 공유된 --- RAG전용 프롬프트 템플릿 참조 생성하기
import { pull } from "langchain/hub";

import { createStuffDocumentsChain } from "langchain/chains/combine_documents";

import { StringOutputParser } from "@langchain/core/output_parsers";
import { IMemberMessage, UserType } from "@/interfaces/message";

//API 호출 결과 반환 데이터 타입 정의하기
type ResponseData = {
  code: number;
  data: string | null | IMemberMessage;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const apiResult: ResponseData = {
    code: 400,
    data: null,
    message: 'QnABot Failed!'
  }
  try {
    if (req.method == 'POST') {

      // Step0: 프론트엔드에서 전달된 질문과 닉네임 정보 추출하기
      const message = req.body.message;
      const nickName = req.body.nickName;

      console.log('qnabot : 채팅창에서 전달받은 prompt : ', message);

      // Step1: Indexing 웹페이지 로더 객체 생성하고 페이지 로딩하기
      // Step1-1: 웹페이지 로딩하기 
      const loader = new CheerioWebBaseLoader('https://api.ncloud-docs.com/docs/common-ncpapi');
      const docs = await loader.load();

      // Step1-2: 텍스트 분할기 객체 생성 및 텍스트 분할하기(Chunk)
      // const textSplitter = RecursiveCharacterTextSplitter.fromLanguage('ko', {
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      // Step1-2b: 텍스트 분할 처리하기 
      const splitDocs = await textSplitter.splitDocuments(docs);

      // Step1-3: 임베딩처리(split된 데이터를 벡터 데이터화 처리)하고 벡터저장소에 저장하기
      // 임베딩시에는 반드시 지정된 임베딩 모델을 통해 임베딩 처리합니다.
      const vectorStore = await MemoryVectorStore.fromDocuments(
        splitDocs,
        new OpenAIEmbeddings()
      );
      

      // Step2: 임베딩 데이터를 조회하기 (리트리버실시)
      // 검색기 생성하기
      const retriever = vectorStore.asRetriever();

      // 사용자 질문을 이용해 벡터 데이터를 조회하고 조회결과를 반환받는다.
      const retrieverResult = await retriever.invoke(message);

      // Step3: RAG 기반(증강된 검색 데이터를 통한) LLM 호출하기
      const gptModel = new ChatOpenAI({
        modelName: 'gpt-4o',
        temperature: 0.2,
        apiKey: process.env.OPENAI_API_KEY
      });

      // RAG 전용 프롬프트 템플릿 생성하기
      const ragPrompt = await pull<ChatPromptTemplate>('rlm/rag-prompt');

      // RAG 전용 프롬프트 기반 체인 생성하기
      const ragChain = await createStuffDocumentsChain({
        llm: gptModel,
        prompt: ragPrompt,
        outputParser: new StringOutputParser(),
        // retriever: retriever,
        // returnSourceDocuments: true,
        // verbose: true
      });

      // 체인 실행해서 RAG 조회 결과를 llm에 전달하고 결과 받아오기 
      const resultMessage = await ragChain.invoke({
        question: message,
        context: retrieverResult,
      });


      //step4: RESTFul AOU 챗봇 응답 메시지 포맷 정의하기 
      const resultMsg: IMemberMessage = {
        user_type: UserType.BOT,
        nick_name: 'Bot',
        message: resultMessage,   // message: result.content as string,
        send_date: new Date(),
      };

      apiResult.code = 200;
      apiResult.data = resultMsg;
      apiResult.message = 'Ok';

    }
    res.json(apiResult);
  } catch (error) {
    const resultMsg: IMemberMessage = {
      user_type: UserType.BOT,
      nick_name: 'Bot',
      message: 'QnABot 챗봇에러발생!',
      send_date: new Date(),
    };

    apiResult.code = 500;
    apiResult.data = resultMsg;
    apiResult.message = 'Server Error Failed!';
    res.json(apiResult);
  }
}