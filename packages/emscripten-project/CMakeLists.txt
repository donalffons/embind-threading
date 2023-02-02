cmake_minimum_required(VERSION 3.5)

project(TestApplication)

add_executable(TestApplication "main.cpp")

set_target_properties(
  TestApplication PROPERTIES
  COMPILE_FLAGS "-pthread"
  LINK_FLAGS "-sEXPORT_ALL=1 -pthread -sPTHREAD_POOL_SIZE=16 -lembind -sALLOW_MEMORY_GROWTH=1 -sMODULARIZE=1 -sEXPORT_NAME=TestApplication -sENVIRONMENT=node,worker"
)
