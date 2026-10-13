---
course_id: course-ds
knowledge_point_id: kp-stack-queue
title: 栈、队列与受限线性结构
---

## 学习目标

- stack-queue-order：逐步推演 LIFO 与 FIFO 状态。
- stack-queue-representation：比较顺序和链接实现的端点成本。
- queue-circular-boundary：在明确的指针约定下计算循环队列状态。
- stack-queue-applications：为问题选择结构并说明选择依据。

## 栈与队列的不变量

栈只在栈顶压入和弹出，遵循后进先出（LIFO）。队列通常在队尾入队、队头出队，遵循先进先出（FIFO）。选择结构取决于所需处理顺序，而不是场景名称；压入/弹出和入队/出队要在具体操作序列中追踪。

### 例一：操作序列中的栈状态

空栈依次 push A、push B、push C，栈顶从底到顶为 A、B、C。第一次 pop 得到 C；再 push D 后，栈顶为 D；下一次 pop 得到 D。新操作只改变顶端，不会让较早元素越过顶端元素。

### 例二：队列中的到达顺序

空队列依次 enqueue 4、enqueue 7、enqueue 9，队头为 4。第一次 dequeue 得到 4，再入队 2 后队列顺序为 7、9、2；下一次 dequeue 得到 7。队列保留的是先后顺序。

栈顶 push/pop 和链式队列头删、尾插在已维护端点时通常为 Θ(1)。顺序数组 push/pop 也为 Θ(1)，除动态扩容时单次 push 可能 Θ(n)；尾部扩容情形按操作序列摊还可为 O(1)。

## 循环队列的指针约定

以下统一使用一个常见约定：容量为 size 的数组中，front 指向队头元素；rear 指向下一个空位置；front==rear 表示空；保留一个空槽以区分满和空，此时 (rear+1) mod size==front 表示满，最多存 size−1 个元素。其他教材可能用计数器或布尔标记占满全部槽，公式会不同。

在该约定下，队列长度为 (rear−front+size) mod size。每次入队先在 rear 写入，再 rear=(rear+1) mod size；出队读取 front，再 front=(front+1) mod size。所有步骤都依赖上述指针含义。

### 例三：跨数组尾部计算队列长度

size=7、front=4、rear=1 时，队列依次占用下标 4、5、6、0，共 4 项。公式给出 (1−4+7) mod 7=4。若 rear 再前进一步成为 2，则 (rear+1) mod 7=3，并未等于 front；继续入队到 rear=3 时，其下一格是 4，正好撞到 front，队列满。

## 结构应用与算法推演

栈适合最近打开者先关闭、撤销最近操作、递归调用返回和 DFS 的深度回溯。队列适合按到达顺序服务、树的层序遍历，以及无权图按边数逐层扩展的 BFS。BFS 找到的是边数最少路径；加权路径不能仅凭 FIFO 队列推断最小总权值。

两个栈可实现队列：入队压入 input；出队时若 output 非空就弹出，否则把 input 逐个弹出并压入 output，再从 output 弹出。元素转移时反转次序。单次转移可能搬动 Θ(n) 项，但每个元素最多被转移一次，因此一串操作的转移成本可摊还到每次 O(1)。

双端队列（deque）允许两端插入和删除；优先队列按优先级选取元素，不等同于 FIFO 队列；循环队列仅改变数组空间复用，不改变 FIFO 语义。

## 成本对照

| 操作 | 顺序数组实现 | 链式实现 | 条件 |
| --- | --- | --- | --- |
| 栈顶 push/pop | Θ(1)，扩容 push 单次可 Θ(n) | 头部操作 Θ(1) | 链式结点分配按常数成本计 |
| 队列 enqueue/dequeue | 循环数组 Θ(1) | 维护头尾指针时 Θ(1) | 若尾插无尾指针，定位尾部另计 Θ(n) |
| 双栈队列单次操作 | 最坏可 Θ(n) | — | 每元素至多搬入 output 一次，摊还 O(1) |
| BFS/层序访问 | Θ(V+E) 的邻接表遍历总体 | — | 图按邻接表存储；邻接矩阵为 Θ(V²) |

## 常见误解与边界

- 栈并不是先进先出；pop 返回最后一次 push 且尚未弹出的元素。
- 循环队列满空条件必须和 front/rear 含义一起写，不能只背一个公式。
- 空一格是常见实现，不是所有循环队列都必须少用一个槽。
- BFS 队列只保证无权图的最少边数距离，不保证任意带权图的最短总成本。
- 双栈队列的摊还 O(1) 不代表每次 dequeue 最坏都是 O(1)。

## 自测提示

给定一串操作时画出队列/栈内容与头尾指针。循环队列题先写数组容量、指针指向和满空约定，再代公式。BFS/DFS 题先说明目标是按层还是沿路径深入。

## 参考来源与状态

- [OpenDSA CS3 Chapter 5 Linear Structures](https://opendsa-server.cs.vt.edu/OpenDSA/Books/CS3/html/index.html)：目录包含 stacks、queues、circular queue、linked queues 与实现章节。目录定位已核查；本页为本项目独立编写，未声明教师审核。