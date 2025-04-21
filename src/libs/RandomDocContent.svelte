<!--
  - Copyright (c) 2023, Terwer . All rights reserved.
  - DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
  -
  - This code is free software; you can redistribute it and/or modify it
  - under the terms of the GNU General Public License version 2 only, as
  - published by the Free Software Foundation.  Terwer designates this
  - particular file as subject to the "Classpath" exception as provided
  - by Terwer in the LICENSE file that accompanied this code.
  -
  - This code is distributed in the hope that it will be useful, but WITHOUT
  - ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
  - FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
  - version 2 for more details (a copy is included in the LICENSE file that
  - accompanied this code).
  -
  - You should have received a copy of the GNU General Public License version
  - 2 along with this work; if not, write to the Free Software Foundation,
  - Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
  -
  - Please contact Terwer, Shenzhen, Guangdong, China, youweics@163.com
  - or visit www.terwer.space if you need additional information or have any
  - questions.
  -->

<script lang="ts">
  import { onMount } from "svelte"
  import { storeName } from "../Constants"
  import RandomDocConfig, { FilterMode, ReviewMode } from "../models/RandomDocConfig"
  import { openTab, showMessage, confirm, Dialog } from "siyuan"
  import RandomDocPlugin from "../index"
  import Loading from "./Loading.svelte"
  import { EbbinghausReviewer } from "../service/EbbinghausReviewer"
  import ReviewDataPanel from "./ReviewDataPanel.svelte"
  import { isContentEmpty } from "../utils/utils"

  // props
  export let pluginInstance: RandomDocPlugin

  // vars
  let isLoading = false
  let storeConfig: RandomDocConfig
  let notebooks = []
  let toNotebookId = ""
  let filterMode = FilterMode.Notebook
  let rootId = ""
  let title = "文档漫步"
  let tips = "信息提升"
  let currentRndId = ""
  let unReviewedCount = 0
  let content = "暂无内容"
  let reviewMode = ReviewMode.Once

  let sqlList: any[] = []
  let currentSql = ""
  let er: EbbinghausReviewer

  // methods
  export const doRandomDoc = async () => {
    if (isLoading) {
      pluginInstance.logger.warn("上次随机还未结束，忽略")
      return
    }

    try {
      isLoading = true
      pluginInstance.logger.info("开始漫游...")
      // 生成漫游ID
      er = new EbbinghausReviewer(storeConfig, pluginInstance)
      const currentRndRes = await er.getRndDoc(async () => {
        pluginInstance.logger.info("开始重新漫游...")
        return await doRandomDoc()
      })
      // 总数
      const total = await er.getTotalDocCount()
      if (storeConfig?.customSqlEnabled) {
        currentRndId = currentRndRes
        if (!currentRndId) {
          clearDoc()
          throw new Error(new Date().toISOString() + "：" + pluginInstance.i18n.docFetchError)
        }
        pluginInstance.logger.info(`已漫游到 ${currentRndId} ...`)
        //根块
        const rootBlock = await pluginInstance.kernelApi.getBlockByID(currentRndId)
        const doc = (await pluginInstance.kernelApi.getDoc(currentRndId)).data as any
        title = rootBlock.content
        content = doc.content ?? ""
        // 只读
        content = content.replace(/contenteditable="true"/g, 'contenteditable="false"')
        // 总数
        const total = await pluginInstance.kernelApi.getRootBlocksCount()
        // 更新访问次数
        const newVisitCount = await er.updateVisitCount(currentRndId)
        tips = `哇哦，穿越大山，跨过大河，在${total}篇文档中，我又为您找到了一篇新的，您已经访问过他${newVisitCount}次哦~`
      } else {
        currentRndId = currentRndRes?.id
        unReviewedCount = currentRndRes?.count ?? "0"
        if (!currentRndId) {
          clearDoc()
          throw new Error(new Date().toISOString() + "：" + pluginInstance.i18n.docFetchError)
        }
        pluginInstance.logger.info(`已漫游到 ${currentRndId} ...`)
        //根块
        const rootBlock = await pluginInstance.kernelApi.getBlockByID(currentRndId)
        const doc = (await pluginInstance.kernelApi.getDoc(currentRndId)).data as any
        title = rootBlock.content
        content = doc.content ?? ""
        // 处理空文档
        const flag = await handleEmptyDoc()
        if (!flag) {
          return
        }
        // 只读
        content = content.replace(/contenteditable="true"/g, 'contenteditable="false"')
        // 更新访问次数
        await er.updateVisitCount(currentRndId)
        tips = `已漫游到新文档，共${total}篇文档，还有${unReviewedCount}篇文档尚未复习，加油💪~`
      }
    } catch (e) {
      clearDoc()
      tips = "文档漫游失败！=>" + e.toString()
    } finally {
      isLoading = false
    }
  }

  // 空文档处理
  const handleEmptyDoc = async () => {
    if (!isContentEmpty(content)) {
      return true
    } else {
      // 更新访问次数
      await er.updateVisitCount(currentRndId)
      // 空文档没必要复习
      if (reviewMode === ReviewMode.Ebbinghaus) {
        await handleReviewFeedback(true)
      }
      clearDoc()
      tips = "当前文档正文为空，2s 后继续下一个"
      setTimeout(async () => {
        await doRandomDoc()
      }, 2000)
      return false
    }
  }

  // 艾宾浩斯操作
  export const handleReviewFeedback = async (success: boolean) => {
    // 艾宾浩斯记忆法
    // 确认感觉会有点多余
    try {
      await er.updateEbbinghausInterval(currentRndId, success)
      const nextReviewDate = await getNextReviewDate()
      showMessage(`已更新复习间隔，下次将在 ${nextReviewDate} 提醒`, 2000)
      // 自动跳转下一篇
      await doRandomDoc()
    } catch (e) {
      showMessage("操作失败：" + e.toString(), 5000, "error")
    }
    // confirm(
    //   "复习反馈",
    //   `确认标记为「${success ? "记得" : "忘记"}」吗？这将影响下次复习时间`,
    //   async () => {
    //     try {
    //       await er.updateEbbinghausInterval(currentRndId, success)
    //       const nextReviewDate = await getNextReviewDate()
    //       showMessage(`已更新复习间隔，下次将在 ${nextReviewDate} 提醒`)
    //       // 自动跳转下一篇
    //       await doRandomDoc()
    //     } catch (e) {
    //       showMessage("操作失败：" + e.toString(), 5000, "error")
    //     }
    //   },
    //   async () => {
    //     // nothing
    //   }
    // )
  }

  // events
  const clearDoc = () => {
    currentRndId = undefined
    content = ""
    tips = "条件已改变，请重新漫游！"
  }

  const notebookChange = async function () {
    // 显示当前选择的名称
    storeConfig.notebookId = toNotebookId
    await pluginInstance.saveData(storeName, storeConfig)
    // 重置文档
    clearDoc()
    pluginInstance.logger.info("storeConfig saved toNotebookId =>", storeConfig)
  }

  const onSqlChange = async function () {
    // 显示当前选择的名称
    storeConfig.currentSql = currentSql
    await pluginInstance.saveData(storeName, storeConfig)
    // 重置文档
    clearDoc()
    pluginInstance.logger.info("storeConfig saved currentSql =>", storeConfig)
  }

  const onReviewModeChange = async function () {
    // 模式切换
    storeConfig.reviewMode = reviewMode
    await pluginInstance.saveData(storeName, storeConfig)
    // 重置文档
    clearDoc()
    pluginInstance.logger.info("storeConfig saved reviewMode =>", storeConfig)
  }

  const onFilterModeChange = async function () {
    // 模式切换
    storeConfig.filterMode = filterMode
    await pluginInstance.saveData(storeName, storeConfig)
    // 重置文档
    clearDoc()
    pluginInstance.logger.info("storeConfig saved filterMode =>", storeConfig)
  }

  const onRootIdChange = async function () {
    // 显示当前选择的名称
    storeConfig.rootId = rootId
    await pluginInstance.saveData(storeName, storeConfig)
    // 重置文档
    clearDoc()
    pluginInstance.logger.info("storeConfig saved rootId =>", storeConfig)
  }

  const getNextReviewDate = async () => {
    const attrs = await pluginInstance.kernelApi.getBlockAttrs(currentRndId)
    return attrs.data["custom-next-review"] || "未设置"
  }

  const openDocEditor = async () => {
    await openTab({
      app: pluginInstance.app,
      doc: {
        id: currentRndId,
      },
    })
  }

  const openDataPanel = async () => {
    if (!currentRndId) {
      showMessage("请先漫游一篇文档再查看", 5000, "error")
      return
    }

    const panelId = "siyuan-random-doc-data-panel"
    const d = new Dialog({
      title: `${pluginInstance.i18n.dataPanel} - ${pluginInstance.i18n.randomDoc}`,
      content: `<div id="${panelId}"></div>`,
      width: pluginInstance.isMobile ? "92vw" : "720px",
    })
    new ReviewDataPanel({
      target: document.getElementById(panelId) as HTMLElement,
      props: {
        pluginInstance: pluginInstance,
        dialog: d,
        currentRndId: currentRndId,
      },
    })
  }

  const openHelpDoc = () => {
    window.open("https://siyuan.wiki/s/20250421162737-l6p21h5")
  }

  // lifecycle
  onMount(async () => {
    // 读取配置
    storeConfig = await pluginInstance.safeLoad(storeName)

    // 读取笔记本
    const res = await pluginInstance.kernelApi.lsNotebooks()
    notebooks = (res?.data as any)?.notebooks ?? []
    // 用户指南不应该作为可以写入的笔记本
    const hiddenNotebook: Set<string> = new Set(["思源笔记用户指南", "SiYuan User Guide"])
    // 没有必要把所有笔记本都列出来
    notebooks = notebooks.filter((notebook) => !notebook.closed && !hiddenNotebook.has(notebook.name))
    // 选中，若是没保存，获取第一个
    toNotebookId = storeConfig?.notebookId ?? notebooks[0].id

    // 筛选模式
    if (!storeConfig?.filterMode) {
      storeConfig.filterMode = FilterMode.Notebook
    }
    filterMode = storeConfig.filterMode
    rootId = storeConfig?.rootId ?? ""

    // 复习模式
    if (!storeConfig?.reviewMode) {
      storeConfig.reviewMode = ReviewMode.Once
    }
    reviewMode = storeConfig.reviewMode

    // 处理自定义 sql
    if (storeConfig?.customSqlEnabled) {
      sqlList = JSON.parse(storeConfig?.sql ?? "[]")
      if (sqlList.length == 0) {
        showMessage(pluginInstance.i18n.customSqlEmpty, 7000, "error")
        return
      }
      currentSql = storeConfig?.currentSql ?? sqlList[0].sql
    }

    // 开始漫游
    await doRandomDoc()
  })
</script>

<div class="fn__flex-1 protyle" data-loading="finished">
  <Loading show={isLoading && storeConfig.showLoading} />
  <div class="protyle-content protyle-content--transition" data-fullwidth="true">
    <div class="protyle-title protyle-wysiwyg--attr" style="margin: 16px 96px 0px;">
      <div
        style="margin:20px 0"
        contenteditable="false"
        data-position="center"
        spellcheck="false"
        class="protyle-title__input"
        data-render="true"
      >
        {title}
      </div>
    </div>
    <div
      class="protyle-wysiwyg protyle-wysiwyg--attr"
      spellcheck="false"
      contenteditable="false"
      style="padding: 16px 96px 281.5px;"
      data-doc-type="NodeDocument"
    >
      <div class="random-action-group">
        <button class="action-item b3-button b3-button--outline" on:click={openDocEditor}>新页签编辑</button>
        <button class="action-item b3-button b3-button--outline" on:click={openDataPanel}>数据面板</button>
        <button
          class="action-item b3-button b3-button--outline help-icon"
          on:click={openHelpDoc}
          title={pluginInstance.i18n.help}
        >
          <svg class="icon" aria-hidden="true">
            <use xlink:href="#iconHelp" />
          </svg>
        </button>
      </div>
      <div class="action-btn-group">
        {#if storeConfig?.customSqlEnabled}
          <select
            class="action-item b3-select fn__flex-center fn__size200 notebook-select"
            bind:value={currentSql}
            on:change={onSqlChange}
          >
            {#if sqlList && sqlList.length > 0}
              {#each sqlList as s (s.sql)}
                <option value={s.sql}>{s.name}</option>
              {/each}
            {:else}
              <option value="">{pluginInstance.i18n.loading}...</option>
            {/if}
          </select>
          <span class="custom-sql">当前使用自定义 SQL 漫游</span>
        {:else}
          <span class="filter-mode-title">筛选模式：</span>
          <select
            bind:value={filterMode}
            class="action-item b3-select fn__flex-center fn__size200 filter-mode-select"
            on:change={onFilterModeChange}
          >
            <option value={FilterMode.Notebook}>笔记本模式</option>
            <option value={FilterMode.Root}>根文档模式</option>
          </select>
          {#if filterMode === FilterMode.Notebook}
            <span class="notebook-title">笔记本：</span>
            <select
              class="action-item b3-select fn__flex-center fn__size200 notebook-select"
              bind:value={toNotebookId}
              on:change={notebookChange}
            >
              <option value="" selected>全部笔记本</option>
              {#if notebooks && notebooks.length > 0}
                {#each notebooks as notebook (notebook.id)}
                  <option value={notebook.id}>{notebook.name}</option>
                {/each}
              {:else}
                <option value="0">{pluginInstance.i18n.loading}...</option>
              {/if}
            </select>
          {:else}
            <span class="root-id-title">根文档ID：</span>
            <input
              class="b3-text-field fn__size200"
              bind:value={rootId}
              on:change={onRootIdChange}
              placeholder="输入根文档ID"
            />
          {/if}
          <span class="mode-select-title">复习模式：</span>
          <select
            bind:value={reviewMode}
            class="action-item b3-select fn__flex-center fn__size200 mode-select"
            on:change={onReviewModeChange}
          >
            <option value={ReviewMode.Once}>一遍过模式</option>
            <option value={ReviewMode.Ebbinghaus}>艾宾浩斯模式</option>
          </select>
        {/if}

        {#if reviewMode === ReviewMode.Ebbinghaus && currentRndId}
          <span class="feedback-buttons">
            <button class="b3-button b3-button--success" on:click={() => handleReviewFeedback(true)}>
              ✅ {"记得(⌥⌘R)"}
            </button>
            <button class="b3-button b3-button--warning" on:click={() => handleReviewFeedback(false)}>
              ❌ {"忘记(⌥⌘F)"}
            </button>
          </span>
        {/if}

        {#if reviewMode !== ReviewMode.Ebbinghaus || !currentRndId}
          <button class="action-item b3-button fr" on:click={doRandomDoc} title="⌥⌘M">
            {isLoading ? "正在漫游..." : "继续漫游(⌥⌘M)"}
          </button>
        {/if}
      </div>
      <div class="rnd-doc-custom-tips">
        <div
          data-type="NodeParagraph"
          class="p"
          style="color: var(--b3-card-info-color);background-color: var(--b3-card-info-background);"
        >
          <div class="t" contenteditable="false" spellcheck="false">{tips}</div>
          <div class="protyle-attr" contenteditable="false" />
        </div>
      </div>
      {@html content}
    </div>
  </div>
</div>

<style lang="stylus">
  .fr
    float right
  .custom-sql
    margin-left 20px
    color: red
    font-size 14px
  .action-btn-group
    margin:20px 0
    .action-item
      margin-left 10px
  //.filter-mode-title
  //  padding-left 10px
  .notebook-title
    padding-left 10px
  .mode-select-title
    padding-left 10px
  .feedback-buttons
    padding-left 10px
  .b3-select
    max-width 120px
  .help-icon
    font-size 12px
</style>
