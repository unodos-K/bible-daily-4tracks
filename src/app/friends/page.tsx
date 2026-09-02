"use client";

import React from "react";
import { HeartHandshake, Copy } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import FriendListWidget from "@/components/friends/FriendListWidget";
import FriendRequestList from "@/components/friends/FriendRequestList";
import FriendSearchBox from "@/components/friends/FriendSearchBox";

export default function FriendsPage() {
  const friendsState = useFriends();

  return (
    <div className="w-full h-full min-h-0 bg-stone-50 dark:bg-stone-950 flex flex-col">
      <div className="w-full max-w-2xl mx-auto flex flex-col h-full min-h-0">
        {/* Sticky 고정 래퍼 */}
        <div className="shrink-0 z-40 bg-stone-50 dark:bg-stone-950 w-full flex flex-col shadow-sm border-b border-stone-200/50 dark:border-stone-800/50">
          {/* 헤더 */}
          <header className="pt-6 pb-2 px-6 flex items-center justify-between w-full">
            <h1 className="text-2xl font-black text-stone-800 dark:text-stone-100 flex items-center gap-2">
              친구
            </h1>
          </header>

          {/* 상단 공통 구역 (소셜 액션) */}
          <div className="px-4 py-3 flex flex-col sm:flex-row gap-2">
            <button
              onClick={friendsState.handleInvite}
              className="flex-1 flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#FDD800] text-black text-sm font-bold py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <HeartHandshake size={16} />
              친구에게 One Verse 추천하기
            </button>
            <button
              onClick={friendsState.handleCopyNickname}
              className="flex-1 flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-sm font-bold py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <Copy size={16} />
              내 닉네임 복사하기
            </button>
          </div>

          <div className="flex px-4 pt-1">
            <button 
              onClick={() => friendsState.setActiveTab("friends")}
              className={`flex-1 pb-3 font-semibold border-b-2 transition-colors ${friendsState.activeTab === "friends" ? "border-stone-800 text-stone-800 dark:border-stone-200 dark:text-stone-200" : "border-transparent text-stone-400 hover:text-stone-600"}`}
            >
              내 친구 ({friendsState.friends.length})
            </button>
            <button 
              onClick={() => friendsState.setActiveTab("requests")}
              className={`flex-1 flex justify-center pb-3 font-semibold border-b-2 transition-colors ${friendsState.activeTab === "requests" ? "border-stone-800 text-stone-800 dark:border-stone-200 dark:text-stone-200" : "border-transparent text-stone-400 hover:text-stone-600"}`}
            >
              <span className="relative">
                받은 요청
                {friendsState.requests.length > 0 && (
                  <span className="absolute -top-1 -right-3 w-2 h-2 rounded-full bg-red-500 ring-2 ring-stone-50 dark:ring-stone-950"></span>
                )}
              </span>
            </button>
            <button 
              onClick={() => friendsState.setActiveTab("search")}
              className={`flex-1 pb-3 font-semibold border-b-2 transition-colors ${friendsState.activeTab === "search" ? "border-stone-800 text-stone-800 dark:border-stone-200 dark:text-stone-200" : "border-transparent text-stone-400 hover:text-stone-600"}`}
            >
              친구 찾기
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-4 pb-8 sm:p-6 sm:pb-8 bg-stone-50 dark:bg-stone-950">
          {friendsState.isLoading ? (
            <div className="flex flex-col gap-3 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 shrink-0"></div>
                    <div className="flex flex-col gap-2">
                      <div className="w-24 h-4 bg-stone-200 dark:bg-stone-800 rounded"></div>
                      <div className="w-16 h-3 bg-stone-200 dark:bg-stone-800 rounded"></div>
                    </div>
                  </div>
                  <div className="w-6 h-6 bg-stone-200 dark:bg-stone-800 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {friendsState.activeTab === "friends" && (
                <FriendListWidget
                  friends={friendsState.friends}
                  friendsFeed={friendsState.friendsFeed}
                  handleLike={friendsState.handleLike}
                  handleTouchStart={friendsState.handleTouchStart}
                  handleTouchEnd={friendsState.handleTouchEnd}
                />
              )}

              {friendsState.activeTab === "requests" && (
                <FriendRequestList
                  requests={friendsState.requests}
                  handleRespondRequest={friendsState.handleRespondRequest}
                  handleTouchStart={friendsState.handleTouchStart}
                  handleTouchEnd={friendsState.handleTouchEnd}
                />
              )}

              {friendsState.activeTab === "search" && (
                <FriendSearchBox
                  searchQuery={friendsState.searchQuery}
                  setSearchQuery={friendsState.setSearchQuery}
                  searchResults={friendsState.searchResults}
                  isSearching={friendsState.isSearching}
                  friends={friendsState.friends}
                  sentRequests={friendsState.sentRequests}
                  handleSearch={friendsState.handleSearch}
                  handleSendRequest={friendsState.handleSendRequest}
                  handleTouchStart={friendsState.handleTouchStart}
                  handleTouchEnd={friendsState.handleTouchEnd}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
