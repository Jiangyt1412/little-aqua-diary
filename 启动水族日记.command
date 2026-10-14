#!/bin/zsh
# 本地静态启动器；仅操作本项目，不写入个人浏览器资料。
cd -- "${0:A:h}" || exit 1 # 使用脚本所在的项目目录。
if ! command -v python3 >/dev/null 2>&1; then
  print '未找到 Python 3。请安装 Python 3 后再启动。' # 明确报告缺失依赖。
  read 'task_continue?按回车退出…'
  exit 1
fi
task_existing=$(curl --silent --max-time 1 http://127.0.0.1:4173/)
if [[ "$task_existing" == *'小小水族日记'* ]]; then
  open 'http://127.0.0.1:4173/' # 复用已经运行的同一日记地址。
  exit 0
fi
if [[ -n "$task_existing" ]]; then
  print '4173 端口已有其他网页运行。请停止该程序后再启动水族日记。' # 防止误打开其他应用。
  read 'task_continue?按回车退出…'
  exit 1
fi
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist & # 启动仅提供静态资源的本地服务。
task_server_pid=$!
trap 'kill "$task_server_pid" 2>/dev/null' EXIT INT TERM # 只清理本脚本创建的服务。
for task_attempt in {1..30}; do
  task_response=$(curl --fail --silent http://127.0.0.1:4173/)
  if [[ "$task_response" == *'小小水族日记'* ]]; then
    open 'http://127.0.0.1:4173/' # 等待服务就绪后再打开浏览器。
    print '水族日记已打开。保持这个窗口打开；按 Ctrl+C 停止。'
    wait "$task_server_pid"
    exit $?
  fi
  if ! kill -0 "$task_server_pid" 2>/dev/null; then
    print '无法启动：4173 端口可能已被其他程序占用，请检查终端错误。'
    read 'task_continue?按回车退出…'
    exit 1
  fi
  sleep 0.1 # 短暂等待本地服务准备完成。
done
print '服务未及时启动，请检查终端信息。'
exit 1
