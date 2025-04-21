import { showMessage, confirm } from "siyuan"
import RandomDocPlugin from "../index"
import RandomDocConfig, { FilterMode, ReviewMode } from "../models/RandomDocConfig"

/**
 * Ebbinghaus复习模式
 *
 * @author terwer
 * @since 1.5.0
 */
class EbbinghausReviewer {
  private storeConfig: RandomDocConfig
  private pluginInstance: RandomDocPlugin

  constructor(storeConfig: RandomDocConfig, pluginInstance: RandomDocPlugin) {
    this.storeConfig = storeConfig
    this.pluginInstance = pluginInstance
  }

  public getRndDoc = async (reTryCb: any): Promise<string | any> => {
    try {
      if (this.storeConfig?.customSqlEnabled) {
        return this.handleCustomSqlMode()
      }

      if (this.storeConfig.reviewMode === ReviewMode.Once) {
        return this.handleOnceMode(reTryCb)
      }

      return this.handleEbbinghausMode()
    } catch (error) {
      this.pluginInstance.logger.error("获取随机文档失败", error)
      throw error
    }
  }

  public getTotalDocCount = async (): Promise<number> => {
    if (this.storeConfig?.customSqlEnabled) {
      return this.pluginInstance.kernelApi.getRootBlocksCount()
    } else {
      const filterCondition = this.buildFilterCondition()
      const sql = `SELECT COUNT(id) AS total FROM blocks  WHERE type = 'd' ${filterCondition}`
      const result = await this.pluginInstance.kernelApi.sql(sql)
      return result.data?.[0]?.total || 0
    }
  }

  public checkAllReviewed = async (): Promise<boolean> => {
    const filterCondition = this.buildFilterCondition()
    const sql = `SELECT COUNT(id) AS total FROM blocks 
            WHERE type = 'd' 
            ${filterCondition}
            AND id NOT IN (
              SELECT block_id FROM attributes 
              WHERE name = 'custom-visit-count'
            )`
    const result = await this.pluginInstance.kernelApi.sql(sql)
    return result.data?.[0]?.total === 0
  }

  public resetAllReviewStatus = async (): Promise<void> => {
    const filterCondition = this.buildFilterCondition()
    let page = 1
    const pageSize = 50
    let hasMore = true

    while (hasMore) {
      const sql = `SELECT id FROM blocks 
              WHERE type = 'd' 
              ${filterCondition}
              AND id IN (
                SELECT block_id FROM attributes 
                WHERE name = 'custom-visit-count'
              )
              LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`

      const result = await this.pluginInstance.kernelApi.sql(sql)
      if (result.code !== 0) {
        showMessage(this.pluginInstance.i18n.docFetchError, 7000, "error")
        throw new Error(result.msg)
      }
      const data = result.data as any[]
      const docIds = data?.map((item) => item.id) || []

      await Promise.all(
        docIds.map(async (docId) => {
          await this.pluginInstance.kernelApi.setBlockAttrs(docId, {
            "custom-visit-count": "",
          })
        })
      )

      hasMore = docIds.length === pageSize
      page++
    }
  }

  public updateVisitCount = async (currentRndId: string) => {
    const visitCount = parseInt(
      (await this.pluginInstance.kernelApi.getBlockAttrs(currentRndId))["custom-visit-count"] ?? 0
    )
    const newVisitCount = visitCount + 1
    await this.pluginInstance.kernelApi.setBlockAttrs(currentRndId, {
      "custom-visit-count": newVisitCount.toString(),
    })
    return newVisitCount
  }

  public updateEbbinghausInterval = async (blockId: string, success: boolean) => {
    const attrsRes = await this.pluginInstance.kernelApi.getBlockAttrs(blockId)
    const attrs = attrsRes.data

    let interval = parseFloat(attrs["custom-interval"] || "1")
    interval = success ? interval * 2 : Math.max(1, interval * 0.5)

    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + Math.round(interval))

    await this.pluginInstance.kernelApi.setBlockAttrs(blockId, {
      "custom-interval": interval.toString(),
      "custom-next-review": nextDate.toISOString().split("T")[0],
      "custom-visit-count": ((parseInt(attrs["custom-visit-count"]) || 0) + 1).toString(),
    })
  }

  private handleCustomSqlMode = async (): Promise<string> => {
    const currentSql = this.storeConfig.currentSql
    const result = await this.pluginInstance.kernelApi.sql(currentSql)
    if (result.code !== 0) {
      showMessage(this.pluginInstance.i18n.docFetchError, 7000, "error")
      throw new Error(result.msg)
    }

    const data = result.data as any[]
    if (!data || data.length === 0) {
      throw new Error(new Date().toISOString() + "：" + "没有找到符合条件的文档")
    }
    const firstKey = Object.keys(data[0])[0]
    const docId = data[0][firstKey]

    this.pluginInstance.logger.info(`自定义SQL获取文档: ${docId}`)
    return docId
  }

  private handleOnceMode = async (reTryCb: any): Promise<string> => {
    let doc = await this.getOnceModeDoc()

    if (!doc) {
      this.pluginInstance.logger.info("没有找到符合条件的文档，开始重置复习状态")
      const allReviewed = await this.checkAllReviewed()
      if (allReviewed) {
        await this.handleCompleteScenario(async () => {
          doc = await this.getOnceModeDoc()
          await reTryCb()
        })
      }
    }

    return doc
  }

  private handleEbbinghausMode = async (): Promise<string> => {
    const filterCondition = this.buildFilterCondition()
    const now = new Date().toISOString().split("T")[0]
    const sql = `SELECT id,count(id) as count FROM blocks 
                WHERE type = 'd' 
                ${filterCondition}
                AND (
                  (SELECT value FROM attributes 
                  WHERE block_id = blocks.id 
                  AND name = 'custom-next-review') < '${now}'
                  OR NOT EXISTS (
                    SELECT 1 FROM attributes 
                    WHERE block_id = blocks.id 
                    AND name = 'custom-next-review'
                  )
                )
                ORDER BY RANDOM() 
                LIMIT 1`

    const result = await this.pluginInstance.kernelApi.sql(sql)
    const data = result.data as any[]
    if (!data?.[0]?.id) {
      throw new Error(new Date().getTime() + "：棒棒哒👍，你已经全部完成复习任务，请耐心等待下次复习周期开始")
    }
    return data[0]
  }

  private getOnceModeDoc = async (): Promise<string> => {
    const filterCondition = this.buildFilterCondition()
    // 先获取符合条件的总记录数
    const countSql = `
        SELECT COUNT(id) as total 
        FROM blocks 
        WHERE 
            type = 'd' 
            ${filterCondition}
            AND id NOT IN (
                SELECT block_id FROM attributes 
                WHERE name = 'custom-visit-count'
            )`
    const countResult = await this.pluginInstance.kernelApi.sql(countSql)
    if (countResult.code !== 0) {
      throw new Error(countResult.msg)
    }
    const total = countResult.data[0]?.total || 0
    if (total === 0) {
      return null
    }

    // 随机选择一个未复习的文档
    const selectSql = `
        SELECT id 
        FROM blocks 
        WHERE 
            type = 'd' 
            ${filterCondition}
            AND id NOT IN (
                SELECT block_id FROM attributes 
                WHERE name = 'custom-visit-count'
            )
        ORDER BY RANDOM() 
        LIMIT 1`
    const selectResult = await this.pluginInstance.kernelApi.sql(selectSql)
    if (selectResult.code !== 0) {
      throw new Error(selectResult.msg)
    }
    const selectedData = selectResult.data as any[]
    if (!selectedData || selectedData.length === 0) return null
    const selectedId = selectedData[0].id

    return {
      id: selectedId,
      count: total,
    } as any
  }

  private buildFilterCondition(): string {
    // 处理旧配置的兼容性
    const filterMode = this.storeConfig.filterMode || FilterMode.Notebook
    const notebookId = this.storeConfig.notebookId || ""
    const rootId = this.storeConfig.rootId || ""

    if (filterMode === FilterMode.Root && rootId && rootId.length > 0) {
      // return `AND root_id = '${rootId}'`
      return `AND path like '%${rootId}%'`
    }
    if (filterMode === FilterMode.Notebook && notebookId && notebookId.length > 0) {
      return `AND box = '${notebookId}'`
    }
    return ""
  }

  private handleCompleteScenario = async (cb: any): Promise<void> => {
    confirm(
      "复习完成",
      "所有文档已完成一轮复习，是否重置复习状态重新开始？",
      async () => {
        showMessage("准备重置文档复习状态，请稍等...", 7000, "info")
        await this.resetAllReviewStatus()
        if (cb) {
          await cb()
        }
        showMessage("已重置所有复习状态", 3000, "info")
      },
      () => {}
    )
  }
}

export { EbbinghausReviewer }
