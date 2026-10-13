from __future__ import annotations

from copy import deepcopy

CATALOG_VERSION = "course-ds-leap-2026.10-v1"
POLICY_VERSION = "leap-ranking-2026.10-v1"
MODEL_VERSION = "bkt-mu-q-v1"

ACTION_TYPES = (
    "diagnostic_probe",
    "contrastive_teaching",
    "prerequisite_repair",
    "guided_practice",
    "transfer_challenge",
    "retrieval_practice",
)

ACTION_META = {
    "diagnostic_probe": ("诊断追问", 3, "用一个聚焦问题区分相近概念，记录当前理解依据。"),
    "contrastive_teaching": ("对比讲解", 5, "并排比较常见误解与正确规则，解释差异从哪里来。"),
    "prerequisite_repair": ("前置补齐", 8, "先补齐后续推理会用到的基础概念，再回到当前知识点。"),
    "guided_practice": ("引导练习", 6, "按步骤完成一个例题，并查看每一步使用的规则。"),
    "transfer_challenge": ("迁移挑战", 8, "把当前规则应用到新的结构或操作场景。"),
    "retrieval_practice": ("间隔提取", 4, "先不看讲解回忆关键规则，再用一道短题自检。"),
}

TOPICS: dict[str, dict] = {
    "linked-list": {
        "id": "linked-list",
        "knowledgePointId": "kp-linear-list",
        "name": "单链表插入复杂度",
        "description": "区分已知前驱后改指针的成本与插入前查找位置的成本，避免把插入总复杂度一概写成 O(1)。",
        "misconceptionCode": "LL_IGNORES_SEARCH_COST",
        "misconceptionTitle": "忽略插入前的定位成本",
        "prerequisites": [{"id": "ds-node-pointer-basics", "name": "结点与指针基础"}],
        "diagnostic": {
            "id": "ds-ll-diagnostic-q07",
            "prompt": "Q07：单链表插入节点只改指针，因此总是 O(1)，你赞同吗？",
            "options": [
                {"id": "a", "text": "赞同，插入只需改指针，所以总是 O(1)"},
                {"id": "b", "text": "只有已知前驱时改指针为 O(1)；若需定位，最坏为 O(n)"},
                {"id": "c", "text": "不赞同，单链表插入总是 O(n)"},
                {"id": "d", "text": "不赞同，单链表插入总是 O(log n)"},
            ],
            "correctOptionId": "b",
            "correctText": "只有已知前驱时改指针为 O(1)；若需定位，最坏为 O(n)",
            "acceptedTerms": ["已知前驱", "o(1)", "定位", "o(n)"],
            "rubric": "必须区分已知前驱后的指针修改 O(1) 与先定位插入位置的最坏 O(n)。",
        },
        "concept": "已知插入位置的前驱结点时，只需创建结点并改动有限条指针，指针修改本身为 O(1)。若题目只给头指针或下标，必须先沿 next 查找前驱；单链表不能随机定位，最坏需要 O(n)，所以完整插入操作最坏为 O(n)。",
        "misconception": "把“改指针只需常数步”误当成“完整插入总是 O(1)”，忽略先找到插入位置的成本。",
        "contrast": "已知前驱：改指针 O(1)。仅给头指针并要求插在第 i 个位置：先顺序定位，最坏 O(n)，然后改指针 O(1)；总成本由定位主导。",
        "example": "在单链表第 100 个位置插入时，若只给头指针，先从头沿 next 找到第 99 个结点，最坏走 O(n)；找到前驱后再用 O(1) 次指针修改完成插入。",
        "fixedAction": "contrastive_teaching",
        "questions": {
            "practice": [
                ("ds-ll-practice-1", "单链表只给头指针，要在下标 i 处插入；整体复杂度主要由哪一步决定？", ["先从头查找或遍历前驱", "o(n)", "定位成本"], "先定位前驱最坏 O(n)，之后改指针 O(1)，完整操作最坏 O(n)。"),
                ("ds-ll-practice-2", "已知结点 p 是插入位置的前驱，要在 p 后插入新结点，复杂度是什么？", ["已知前驱", "o(1)", "改指针", "链接"], "因为前驱已给出，不需查找；修改有限条链接是 O(1)。"),
                ("ds-ll-practice-3", "比较只给头指针按下标插入与已知前驱后插入，复杂度分别是什么？", ["定位", "o(n)", "已知前驱", "o(1)"], "仅给头指针需先定位最坏 O(n)；已知前驱后指针修改 O(1)。"),
            ],
            "probe": [
                ("ds-ll-probe-1", "解释单链表插入为什么不能总写成 O(1)：分别说明先定位插入位置的成本与已知前驱后改指针的成本。", [{"all": ["o(n)"], "any": ["定位", "查找", "遍历", "寻找", "从头"]}, {"any": ["已知前驱", "已知结点", "已知节点"]}, {"all": ["o(1)"], "any": ["改指针", "指针", "链接", "插入", "修改"]}], "必须同时满足三组要点：先定位/查找/遍历最坏 O(n)；已知前驱/结点后改指针为 O(1)。"),
                ("ds-ll-probe-2", "若只给出头指针，要在第 k 个位置插入，定位前驱需要怎样操作？完整操作最坏多少？", ["从头", "next", "查找", "o(n)"], "指出先从头沿 next 查找前驱，定位最坏 O(n)，之后指针修改 O(1)。"),
                ("ds-ll-probe-3", "链表插入常被说成 O(1)。这个结论成立的前提是什么？若没给前驱呢？", ["已知前驱", "指针", "o(1)", "查找", "o(n)"], "说明只有已知前驱时改链接为 O(1)；若需先查找前驱，总操作最坏 O(n)。"),
                ("ds-ll-probe-4", "比较单链表头部插入和仅给头指针的中间位置插入，解释两者定位与修改成本。", ["头部", "o(1)", "定位", "o(n)", "已知前驱"], "头部插入无需扫描，整体 O(1)；中间位置若需先定位前驱最坏 O(n)，找到后修改 O(1)。"),
                ("ds-ll-probe-5", "若仅给出待插入位置的结点 x 而未给其前驱，单链表为何可能仍需 O(n)？", ["单链表", "前驱", "从头", "查找", "o(n)"], "单链表结点没有反向链接，需从头查找 x 的前驱，最坏 O(n)。"),
            ],
            "retest": [
                ("ds-ll-retest-1", "仅给头指针删除单链表第 i 个结点时，为什么整体通常仍为 O(n)，即使改链接可为 O(1)？", ["先定位", "从头", "o(n)", "链接", "o(1)"], "先从头定位前驱 O(n)，找到后改链接 O(1)，总成本由定位主导。"),
                ("ds-ll-retest-2", "已知前驱 p 后在 p 与其后继之间插入，需遍历链表吗？复杂度是多少？", ["已知前驱", "不需", "遍历", "o(1)"], "不需额外定位，有限次链接修改为 O(1)。"),
                ("ds-ll-retest-3", "某算法先查找单链表的中间插入位置，再插入。分别计算两步成本和总成本。", ["查找", "o(n)", "插入", "o(1)", "总", "o(n)"], "查找前驱最坏 O(n)，找到后改链接 O(1)，总复杂度 O(n)。"),
                ("ds-ll-retest-4", "若要在链表头部插入，定位成本和改指针成本分别如何？", ["头部", "无需定位", "o(1)", "改指针"], "头部位置已知，无需遍历；更新头指针即可，整体 O(1)。"),
                ("ds-ll-retest-5", "说明“链表插入 O(1)”的完整前提，并描述未给前驱时增加的成本。", ["已知前驱", "o(1)", "先定位", "查找", "o(n)"], "已知前驱后改链接 O(1)；否则先查找前驱最坏 O(n)。"),
            ],
        },
    },
    "stack-queue": {
        "id": "stack-queue",
        "knowledgePointId": "kp-stack-queue",
        "name": "栈与队列的出入顺序",
        "description": "根据最近进入或最早进入的访问顺序，选择栈或队列，并追踪基本操作结果。",
        "misconceptionCode": "SQ_ORDER_CONFUSION",
        "misconceptionTitle": "混淆栈的后进先出与队列的先进先出",
        "prerequisites": [{"id": "kp-linear-list", "name": "线性表"}],
        "diagnostic": {
            "id": "ds-sq-diagnostic-v1",
            "prompt": "任务要求最先到达的请求最先被处理，最适合使用哪种结构？",
            "options": [
                {"id": "a", "text": "栈（LIFO）"},
                {"id": "b", "text": "队列（FIFO）"},
                {"id": "c", "text": "二叉搜索树"},
                {"id": "d", "text": "无序集合"},
            ],
            "correctOptionId": "b",
            "correctText": "队列（FIFO）",
            "acceptedTerms": ["队列", "fifo", "先进先出"],
            "minimumTerms": 1,
            "rubric": "选择队列，并将 FIFO 与最早到达者先处理对应起来。",
        },
        "concept": "栈在同一端压入和弹出，遵循后进先出（LIFO）；队列在尾部入队、头部出队，遵循先进先出（FIFO）。选择结构要看任务要求保留的顺序。",
        "misconception": "把最近到达优先与最早到达优先混为一谈，或只记结构名称而不追踪操作次序。",
        "contrast": "栈：最后压入的元素先弹出；队列：最先入队的元素先出队。浏览器返回历史常用栈，排队服务常用队列。",
        "example": "队列依次入队 A、B、C，再出队两次，结果是 A、B；栈依次压入 A、B、C，再弹出两次，结果是 C、B。",
        "fixedAction": "guided_practice",
        "questions": {
            "practice": [
                ("ds-sq-practice-1", "栈依次 push A、B、C，再 pop 一次，返回什么？", ["c", "最后", "lifo"], "栈按 LIFO，最后压入的 C 先弹出。"),
                ("ds-sq-practice-2", "队列依次入队 4、7、9，再出队一次，得到什么？", ["4", "最早", "fifo"], "队列按 FIFO，最先入队的 4 先出队。"),
                ("ds-sq-practice-3", "撤销最近一次编辑要优先撤销最后做的操作，选择栈还是队列？", ["栈", "lifo", "后进先出"], "最近发生的操作应最先撤销，符合栈的 LIFO。"),
            ],
            "probe": [
                ("ds-sq-probe-1", "分别写出栈与队列的处理顺序，并用 A、B、C 的入结构次序解释各自第一次取出的值。", ["栈", "lifo", "c", "队列", "fifo", "a"], "说明栈 LIFO 首先取 C、队列 FIFO 首先取 A。"),
                ("ds-sq-probe-2", "打印任务按提交先后处理，应选什么结构？请说明哪一个任务先出来。", ["队列", "fifo", "最先", "先提交"], "选择 FIFO 队列，先提交的任务先出队。"),
                ("ds-sq-probe-3", "深度优先遍历需要优先扩展最近发现的顶点时，栈为什么合适？", ["栈", "lifo", "最近", "后进先出"], "指出栈会先取最近压入的待访问顶点，符合该 DFS 策略。"),
                ("ds-sq-probe-4", "队列中已有 X、Y，之后入队 Z。下一次出队结果是什么，依据什么规则？", ["x", "fifo", "先进先出", "最早"], "X 最早入队，因此按 FIFO 先出队。"),
                ("ds-sq-probe-5", "一串嵌套括号要检查最近打开的括号是否先闭合，使用哪种结构？", ["栈", "最近", "lifo", "后进先出"], "最新打开的括号应最先匹配，适合栈的 LIFO 顺序。"),
            ],
            "retest": [
                ("ds-sq-retest-1", "任务按提交时间先来先服务；写出应选择的结构和首个服务的请求。", ["队列", "fifo", "最早", "先提交"], "选择队列，最早提交的请求先服务。"),
                ("ds-sq-retest-2", "栈中从底到顶依次为 P、Q、R，连续弹出两次，结果是什么？", ["r", "q", "lifo", "后进先出"], "R 后进先出先出，然后 Q。"),
                ("ds-sq-retest-3", "递归调用返回时通常先处理最近尚未结束的调用，这与哪种结构顺序一致？", ["栈", "lifo", "最近", "后进先出"], "递归调用帧按后进先出展开，符合栈。"),
                ("ds-sq-retest-4", "队列依次加入 2、5、8，出队 2 个后剩下什么？", ["8", "先进先出", "fifo"], "依次移除最早的 2 与 5，剩余 8。"),
                ("ds-sq-retest-5", "比较栈与队列的插入和取出位置，并说明各自适用的顺序。", ["栈", "一端", "队列", "两端", "lifo", "fifo"], "栈同端操作且 LIFO；队列一端入、另一端出且 FIFO。"),
            ],
        },
    },
    "bst": {
        "id": "bst",
        "knowledgePointId": "kp-trees",
        "name": "二叉搜索树与平衡",
        "description": "按左小右大的规则判断搜索路径，并根据插入顺序认识普通 BST 可能退化成链。",
        "misconceptionCode": "BST_ALWAYS_BALANCED",
        "misconceptionTitle": "误以为普通二叉搜索树会自动保持平衡",
        "prerequisites": [{"id": "ds-binary-tree-structure", "name": "二叉树结点与左右子树"}],
        "diagnostic": {
            "id": "ds-bst-diagnostic-v1",
            "prompt": "普通二叉搜索树按 1、2、3、4 的顺序依次插入且不做平衡处理，树形更可能怎样？",
            "options": [
                {"id": "a", "text": "自动形成完全平衡树"},
                {"id": "b", "text": "形成向右倾斜的链状结构"},
                {"id": "c", "text": "无法插入，因为值有序"},
                {"id": "d", "text": "随机形成平衡树"},
            ],
            "correctOptionId": "b",
            "correctText": "形成向右倾斜的链状结构",
            "acceptedTerms": ["右倾", "链", "不平衡", "退化"],
            "minimumTerms": 1,
            "rubric": "说明普通 BST 只保证左小右大的次序，不自动平衡；有序插入可退化为链。",
        },
        "concept": "普通 BST 满足左子树键值较小、右子树键值较大。该次序不保证高度平衡；按递增序列插入可能形成右斜链，查找最坏 O(n)。自平衡树需要额外旋转或重构规则。",
        "misconception": "把二叉搜索次序条件误认为平衡条件，或把 AVL/红黑树的维护规则套到普通 BST。",
        "contrast": "普通 BST 仅维护键值次序；AVL、红黑树等自平衡结构还维护高度或颜色约束，并通过旋转等操作调整形状。",
        "example": "依次插入 1、2、3、4，普通 BST 中每个新值都进入右侧，树高接近 n；查找最坏可为 O(n)。",
        "fixedAction": "contrastive_teaching",
        "questions": {
            "practice": [
                ("ds-bst-practice-1", "普通 BST 依次插入 3、6、9，树高平衡规则会自动触发吗？", ["不会", "普通 bst", "不自动", "退化"], "普通 BST 不包含自动平衡规则，有序插入可能形成右斜形状。"),
                ("ds-bst-practice-2", "普通 BST 搜索 12 时当前结点为 8，下一步应往哪侧？", ["右", "大于", "右子树"], "12 大于 8，按 BST 次序进入右子树。"),
                ("ds-bst-practice-3", "什么额外机制让 AVL 树与普通 BST 的平衡保证不同？", ["高度", "旋转", "平衡", "维护"], "AVL 会维护高度平衡条件，必要时通过旋转调整。"),
            ],
            "probe": [
                ("ds-bst-probe-1", "说明普通 BST 保证什么、不保证什么，以及单调有序插入时的最坏查找复杂度。", ["左小右大", "次序", "不平衡", "退化", "o(n)"], "完整回答包含左小右大次序、不保证平衡、有序插入可退化且最坏查找 O(n)。"),
                ("ds-bst-probe-2", "依次插入 2、4、6、8 后，普通 BST 的形状和高度大致如何？为什么？", ["右", "链", "不平衡", "高度", "n"], "节点都沿右侧连接，形成链状退化结构，高度接近 n。"),
                ("ds-bst-probe-3", "为何不能仅凭“二叉搜索树”就断言查找一定是 O(log n)？", ["不保证平衡", "有序插入", "退化", "o(n)"], "BST 次序本身不限制高度；有序插入会退化，最坏查找 O(n)。"),
                ("ds-bst-probe-4", "普通 BST 与自平衡 BST 在插入后维护的性质上有什么区别？", ["次序", "平衡", "旋转", "高度"], "普通 BST 维护键值次序；自平衡 BST 还维护高度/颜色约束并调整树形。"),
                ("ds-bst-probe-5", "若插入顺序改为 5、2、8、1、3，树形为何可能比单调顺序浅？", ["左右", "分散", "两侧", "高度", "次序"], "键值分布到左右子树，路径可缩短；普通 BST 仍不作最坏平衡保证。"),
            ],
            "retest": [
                ("ds-bst-retest-1", "请给出一个会让普通 BST 退化的插入序列，并说明结果树的形状。", ["递增", "递减", "有序", "链", "右"], "递增或递减序列会让节点偏向同一侧，形成斜链。"),
                ("ds-bst-retest-2", "普通 BST 的查找最坏复杂度取决于什么？有序插入时是什么？", ["高度", "树高", "o(n)", "退化"], "查找由树高决定；有序插入可退化，高度 O(n)。"),
                ("ds-bst-retest-3", "“左小右大”为什么不能推出 BST 一定平衡？", ["次序", "高度", "不限制", "平衡"], "左小右大只约束键值次序，没有限制左右高度差。"),
                ("ds-bst-retest-4", "当普通 BST 形状像一条链时，查找行为更接近哪种结构的逐步访问？", ["链", "顺序", "o(n)", "逐个"], "树高接近 n，搜索路径可能逐层走过 O(n) 个节点。"),
                ("ds-bst-retest-5", "如果业务要求稳定的 O(log n) 级别最坏查找，普通 BST 的哪项缺失需要补上？", ["平衡", "高度", "维护", "旋转"], "需维护平衡高度的规则，例如自平衡树的调整操作。"),
            ],
        },
    },
    "graph-search": {
        "id": "graph-search",
        "knowledgePointId": "kp-graphs",
        "name": "BFS与DFS适用条件",
        "description": "用访问次序解释广度优先与深度优先遍历，并选取对应的队列或栈。",
        "misconceptionCode": "GRAPH_BFS_DFS_ORDER",
        "misconceptionTitle": "混淆 BFS 的逐层扩展与 DFS 的深入回溯",
        "prerequisites": [
            {"id": "kp-stack-queue", "name": "栈与队列"},
            {"id": "ds-adjacency-representation", "name": "图的邻接表示"},
        ],
        "diagnostic": {
            "id": "ds-graph-diagnostic-v1",
            "prompt": "从起点开始，若要先访问所有距离为 1 的顶点，再访问距离为 2 的顶点，通常使用哪种遍历？",
            "options": [
                {"id": "a", "text": "深度优先 DFS"},
                {"id": "b", "text": "广度优先 BFS"},
                {"id": "c", "text": "二分查找"},
                {"id": "d", "text": "拓扑排序一定如此"},
            ],
            "correctOptionId": "b",
            "correctText": "广度优先 BFS",
            "acceptedTerms": ["bfs", "广度优先", "逐层", "队列"],
            "minimumTerms": 1,
            "rubric": "识别 BFS 按距离逐层扩展，并可指出队列保存待访问顶点。",
        },
        "concept": "BFS 按层访问距离递增的顶点，典型实现使用队列；DFS 沿一条路径尽量深入后回溯，典型实现使用递归调用栈或显式栈。无权图从起点的最短边数路径可由 BFS 获得。",
        "misconception": "把 BFS 与 DFS 的访问顺序混淆，或未将 BFS 的队列、DFS 的栈/递归与顺序联系起来。",
        "contrast": "BFS 先扩展当前层的所有待访问顶点（FIFO 队列）；DFS 优先继续最近发现的顶点（LIFO 栈/递归）。",
        "example": "从 A 出发邻接 B、C，B 再连 D：BFS 先访问 B、C，再到 D；DFS 可能沿 A-B-D 深入后回溯。",
        "fixedAction": "retrieval_practice",
        "questions": {
            "practice": [
                ("ds-graph-practice-1", "无权图按边数找从起点到各点的最短路径，常用 BFS 还是 DFS？", ["bfs", "广度", "逐层", "队列"], "BFS 按层扩展，首次到达时得到无权图最短边数距离。"),
                ("ds-graph-practice-2", "DFS 需要回到最近遇到但尚未探索完的分支时，哪种顺序有帮助？", ["栈", "lifo", "递归", "回溯"], "递归调用栈或显式栈保存最近发现的待探索路径。"),
                ("ds-graph-practice-3", "BFS 中尚待处理的顶点通常放在哪种结构？", ["队列", "fifo", "先进先出"], "队列按 FIFO 顺序处理待访问顶点。"),
            ],
            "probe": [
                ("ds-graph-probe-1", "比较 BFS 与 DFS 的扩展顺序、典型辅助结构，并说明哪一个适用于无权图最短边数路径。", ["bfs", "逐层", "队列", "dfs", "深入", "栈", "最短"], "说明 BFS 逐层+队列并用于无权最短边数路径；DFS 深入+栈/递归。"),
                ("ds-graph-probe-2", "起点 A 相邻 B、C，B 相邻 D。按邻接 B 在前，BFS 会先处理哪一层，再访问 D？", ["b", "c", "同层", "队列", "d"], "先处理距离 1 的 B、C，再处理距离 2 的 D。"),
                ("ds-graph-probe-3", "为什么 DFS 常用递归或显式栈，而 BFS 常用队列？", ["dfs", "深入", "栈", "bfs", "逐层", "队列"], "DFS 需要沿最近发现的路径深入，符合栈；BFS 需先处理较早入队的同层顶点，符合队列。"),
                ("ds-graph-probe-4", "图遍历如何避免无向环导致顶点反复访问？说明标记时机。", ["访问标记", "visited", "入队", "发现", "一次"], "在发现顶点时标记 visited，避免重复入队/递归访问。"),
                ("ds-graph-probe-5", "如果只要求从起点触达所有可达点而不要求按距离最短，BFS 与 DFS 都能完成吗？", ["都可以", "bfs", "dfs", "可达", "遍历"], "两者都能遍历可达顶点；若要无权最短边数距离，应选择 BFS。"),
            ],
            "retest": [
                ("ds-graph-retest-1", "说明 BFS 为什么按距离逐层访问，并写出实现中保存待访问顶点的结构。", ["距离", "逐层", "队列", "fifo"], "BFS 使用 FIFO 队列，先处理较早发现的当前层顶点，再扩展下一层。"),
                ("ds-graph-retest-2", "DFS 访问到分支尽头后，怎样找到最近的未完成路径？", ["回溯", "栈", "递归", "最近"], "通过递归调用栈或显式栈回到最近的未完成分支。"),
                ("ds-graph-retest-3", "在无权图中求起点到其他顶点的最少边数，选择哪个遍历，为什么？", ["bfs", "广度", "逐层", "最短", "边数"], "BFS 按层增加边数，首次发现某顶点即有最少边数路径。"),
                ("ds-graph-retest-4", "BFS 与 DFS 都是图搜索，但哪项行为差异决定了它们的辅助结构不同？", ["逐层", "深入", "队列", "栈", "次序"], "BFS 同层先行，用 FIFO 队列；DFS 最近分支先行，用栈/递归。"),
                ("ds-graph-retest-5", "图中一个顶点可能由多个邻居到达，遍历时为什么要记录已发现集合？", ["重复", "visited", "标记", "避免", "环"], "记录已发现顶点可避免环或多条路径导致重复访问。"),
            ],
        },
    },
}


_RUBRIC_ALIASES = {
    "complexity_on": ["o(n)", "线性", "线性时间", "线性复杂度"],
    "complexity_o1": ["o(1)", "常数", "常数时间", "constant time"],
    "stack": ["栈", "stack"],
    "lifo": ["lifo", "后进先出", "last in first out"],
    "queue": ["队列", "queue"],
    "fifo": ["fifo", "先进先出", "first in first out"],
    "bfs": ["bfs", "广度优先", "breadth first"],
    "dfs": ["dfs", "深度优先", "depth first"],
    "search": ["查找", "寻找", "定位", "遍历", "搜索"],
    "from_head": ["从头", "从头结点", "从头节点", "头指针"],
    "predecessor": ["前驱", "前驱结点", "前驱节点"],
    "pointer_update": ["改指针", "修改指针", "改链接", "修改链接", "更新链接"],
}

_RUBRIC_OVERRIDES = {
    "ds-ll-probe-1": [
        {"all": ["o(n)"], "any": ["定位", "查找", "遍历", "寻找", "从头"]},
        {"any": ["已知前驱", "已知结点", "已知节点"]},
        {"all": ["o(1)"], "any": ["改指针", "指针", "链接", "插入", "修改"]},
    ],
    "ds-ll-probe-2": [
        {"any": _RUBRIC_ALIASES["from_head"]},
        {"any": ["next", "指针"]},
        {"any": _RUBRIC_ALIASES["search"]},
        {"any": _RUBRIC_ALIASES["complexity_on"]},
    ],
    "ds-ll-probe-3": [
        {"any": _RUBRIC_ALIASES["predecessor"]},
        {"any": _RUBRIC_ALIASES["complexity_o1"]},
        {"any": _RUBRIC_ALIASES["search"]},
        {"any": _RUBRIC_ALIASES["complexity_on"]},
    ],
    "ds-ll-probe-4": [
        {"all": ["o(1)"], "any": ["头部"]},
        {"all": ["o(n)"], "any": ["定位", "遍历", "查找", "前驱"]},
        {"all": ["o(1)"], "any": ["已知前驱", "指针修改", "修改指针"]},
    ],
    "ds-ll-probe-5": [
        {"any": ["单链表"]},
        {"any": _RUBRIC_ALIASES["predecessor"]},
        {"any": _RUBRIC_ALIASES["from_head"]},
        {"any": _RUBRIC_ALIASES["search"]},
        {"any": _RUBRIC_ALIASES["complexity_on"]},
    ],
    "ds-sq-probe-1": [
        {"any": _RUBRIC_ALIASES["stack"]},
        {"any": _RUBRIC_ALIASES["lifo"]},
        {"any": ["c"]},
        {"any": _RUBRIC_ALIASES["queue"]},
        {"any": _RUBRIC_ALIASES["fifo"]},
        {"any": ["a"]},
    ],
    "ds-sq-probe-2": [
        {"any": ["b"]},
        {"any": ["c"]},
        {"any": ["同层", "距离为 1", "第一层"]},
        {"any": _RUBRIC_ALIASES["queue"]},
        {"any": ["d"]},
    ],
    "ds-bst-probe-1": [
        {"any": ["左子树小", "左侧小", "左子树键值较小", "左边小"]},
        {"any": ["右子树大", "右侧大", "右子树键值较大", "右边大"]},
        {"any": ["不保证平衡", "不自动平衡", "不一定平衡", "不保证高度平衡"]},
        {"any": ["有序插入", "递增插入", "递减插入", "单调插入"]},
        {"any": ["退化", "链状", "斜链", "斜树"]},
        {"any": _RUBRIC_ALIASES["complexity_on"]},
    ],
    "ds-graph-probe-1": [
        {"any": _RUBRIC_ALIASES["bfs"]},
        {"any": ["逐层", "按层"]},
        {"any": _RUBRIC_ALIASES["queue"] + _RUBRIC_ALIASES["fifo"]},
        {"any": _RUBRIC_ALIASES["dfs"]},
        {"any": ["深入", "走到底", "回溯"]},
        {"any": _RUBRIC_ALIASES["stack"] + _RUBRIC_ALIASES["lifo"] + ["递归"]},
        {"any": ["无权图最短", "最短边数", "最少边数"]},
    ],
}


def _groups_for_terms(question_id: str, accepted_terms: list) -> list[dict]:
    if question_id in _RUBRIC_OVERRIDES:
        return _RUBRIC_OVERRIDES[question_id]
    if accepted_terms and isinstance(accepted_terms[0], dict):
        return accepted_terms
    aliases = {
        term.casefold(): (name, values)
        for name, values in _RUBRIC_ALIASES.items()
        for term in values
    }
    groups: list[dict] = []
    seen: set[str] = set()
    for term in accepted_terms:
        alias = aliases.get(term.casefold())
        if alias is None:
            groups.append({"any": [term]})
            continue
        name, values = alias
        if name not in seen:
            groups.append({"any": values})
            seen.add(name)
    return groups


def _text_question(question_id: str, prompt: str, accepted_terms: list, rubric: str) -> dict:
    rubric_groups = _groups_for_terms(question_id, accepted_terms)
    return {
        "id": question_id,
        "prompt": prompt,
        "options": [],
        "responseMode": "text",
        "rubricGroups": rubric_groups,
        "rubric": rubric,
    }


QUESTION_BANKS: dict[str, dict[str, list[dict]]] = {}
for topic_id, topic in TOPICS.items():
    question_sets: dict[str, list[dict]] = {}
    for stage in ("practice", "probe", "retest"):
        questions = []
        for question_id, prompt, accepted_terms, rubric in topic["questions"][stage]:
            questions.append(_text_question(question_id, prompt, accepted_terms, rubric))
        question_sets[stage] = questions
    QUESTION_BANKS[topic_id] = question_sets


def public_question(spec: dict) -> dict:
    question = {
        "id": spec["id"],
        "prompt": spec["prompt"],
        "options": deepcopy(spec.get("options", [])),
    }
    question["responseMode"] = spec.get("responseMode", "choice")
    return question


def catalog_payload() -> dict:
    topics = []
    for topic in TOPICS.values():
        topics.append(
            {
                "id": topic["id"],
                "knowledgePointId": topic["knowledgePointId"],
                "name": topic["name"],
                "description": topic["description"],
                "misconceptionCode": topic["misconceptionCode"],
                "misconceptionTitle": topic["misconceptionTitle"],
                "prerequisites": deepcopy(topic["prerequisites"]),
                "diagnosticQuestion": public_question(topic["diagnostic"]),
                "strategies": [
                    {
                        "type": action_type,
                        "label": ACTION_META[action_type][0],
                        "minutes": ACTION_META[action_type][1],
                        "description": ACTION_META[action_type][2],
                    }
                    for action_type in ACTION_TYPES
                ],
            }
        )
    return {
        "version": CATALOG_VERSION,
        "policyVersion": POLICY_VERSION,
        "reviewStatus": "pending_human_review",
        "topics": topics,
    }
