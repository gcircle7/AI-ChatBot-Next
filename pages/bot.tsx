// 리액트 useState 혹은 화면UI요소에 데이터를 바인딩하기 위한 방법을 제공함
// UI요소와 useState훅으로 만들어진 데이터바인딩을 통해 : model-view-view-model (MVVM 패턴)
import { useState } from 'react';

import moment from 'moment';

//메시지 타입 참조하기
import { IMemberMessage, IMessage, UserType } from '@/interfaces/message';

const Bot = () => {
  const [nickName, setNickName] = useState<string>('');

  // 사용자 입력 메시지 상태관리변수 선언 및 초기값 설정하기
  const [message, setMessage] = useState<string>('');

  //메시지 이력을 관리할 상태변수 선언 및 초기값 설정하기
  const [messageList, setMessageList] = useState<IMemberMessage[]>([
  // {
  //   user_type: UserType.USER,
  //   message: '하이 ~',
  //   send_date: new Date(),
  // },
  // {
  //   user_type: UserType.BOT,
  //   message: '안녕하세요. 무엇을 도와드릴까요?',
  //   send_date: new Date(),
  // },
  // {
  //   user_type: UserType.USER,
  //   message: '저녁 메뉴를 추천해줘',
  //   send_date: new Date(),
  // },
  ]);

  //메시지 전송버튼 클릭시 백엔드 특정 API 호출하기 함수 구현
  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    // 홈이벤트가 발생하면 지정된 페이지로 이동하거나 화면이 껌벅거리면서 새로고침되는 현상 방비
    e.preventDefault();

    //사용자 입력 메시지 메시지목록에 추가하기
    const userMessage: IMemberMessage = {
      user_type: UserType.USER,
      nick_name: nickName,
      message: message,
      send_date: new Date(),
    };
    setMessageList((prev) => [...prev, userMessage]);

    //프론트엔드에서 백엔드의 특정 REST API를 호출하는 Data Fetching
    try {
      const response = await fetch('/api/bot/qnabot', {
      // const response = await fetch('/api/bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickName: nickName,
          message: message,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        console.log('백엔드 API에서 전달된 결과값:', result);

        //챗봇이 보내준 메시지를 받아 메시지 이력에 반영하기
        setMessageList((prev) => [...prev, result.data]);

        //사용자 입력메시지 값 초기화하기
        setMessage('');
      } else {
        console.error('API 호출 실패:', response.status);
      }
    } catch (error) {
      console.error('API 호출 중 오류 발생:', error);
    }
  };

  return (
    <div className="flex h-screen antialiased text-gray-800 mt-3 pb-10">
      <div className="flex flex-row h-full w-full overflow-x-hidden">
        <div className="flex flex-col flex-auto h-full p-6">
          <div className="flex flex-col flex-auto flex-shrink-0 rounded-2xl bg-gray-100 h-full p-4">
            {/* 메시지 목록 출력영역 */}
            <div className="flex flex-col h-full overflow-x-auto mb-4">
              <div className="flex flex-col h-full">
                <div className="grid grid-cols-12 gap-y-2">
                  {/* 메시지목록 데이터 기반 출력하기 */}
                  {messageList.map((rec, index) => {
                    if (!rec) return null;
                    return (
                      <div key={index} className={rec.user_type === UserType.USER ? "col-start-6 col-end-13 p-3 rounded-lg" : "col-start-1 col-end-8 p-3 rounded-lg"}>
                        <div className={`flex ${rec.user_type === UserType.USER ? "items-center justify-start flex-row-reverse" : "flex-row items-center"}`}>
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-500 flex-shrink-0">
                            A
                          </div>
                          <div className={`relative ${rec.user_type === UserType.USER ? "mr-3 bg-indigo-100" : "ml-3 bg-white"} text-sm py-2 px-4 shadow rounded-xl`}>
                            <div>
                              {rec.message.split('\n').map((line, i) => (
                                <p key={i}>{line.trim()}</p>
                              ))}
                            </div>
                            <div className={`absolute w-[200px] text-xs bottom-0 ${rec.user_type === UserType.USER ? "right-0 text-right" : "left-0"} -mb-5 text-gray-500`}>
                              {rec.user_type === UserType.USER ? "User" : "Bot"}: {moment(rec.send_date).format('YYYY-MM-DD HH:mm')}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 메시지 입력 및 보내기 영역 */}
            <form
              onSubmit={sendMessage}
              className="flex flex-row items-center h-16 rounded-xl bg-white w-full px-4"
            >
              {/* 파일첨부버튼영역 */}
              <div>
                <button className="flex items-center justify-center text-gray-400 hover:text-gray-600">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                  </svg>
                </button>
              </div>

              {/* 메시지 입력요소 영역 */}
              <div className="flex-grow ml-4">
                <div className="flex w-full">
                  <input
                    type="text"
                    value={nickName}
                    onChange={(e) => {
                      setNickName(e.target.value);
                    }}
                    placeholder="닉네임"
                    className="flex w-[80px] border rounded-xl focus:outline-none focus:border-indigo-300 pl-4 h-10"
                  />

                  <input
                    type="text"
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                    }}
                    className="flex ml-2 w-full border rounded-xl focus:outline-none focus:border-indigo-300 pl-4 h-10"
                  />
                </div>
              </div>

              {/* 메시지 전송버튼 영역 */}
              <div className="ml-4">
                <button
                  type="submit"
                  className="flex h-[38x] items-center justify-center bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white px-4 py-1 flex-shrink-0"
                >
                  <span>Send</span>
                  <span className="ml-2">
                    <svg
                      className="w-4 h-4 transform rotate-45 -mt-px"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                    </svg>
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bot;
